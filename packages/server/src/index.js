#!/usr/bin/env node

'use strict'

const sessions = {}

const WebSocket = require('ws')
const os = require('os')
const http = require('http')

const httpStatuses = Object.entries(http.STATUS_CODES)
const httpStatus = text =>
  Number(httpStatuses.find(([, value]) => value === text)[0])

const freeSession = () => {
  const free = Object.keys(sessions).filter(x => !sessions[x].debug)
  if (!free.length) return {}
  return sessions[free[0]]
}

const freeDebug = () => {
  const free = Object.keys(sessions).filter(
    x => !sessions[x].debug && sessions[x].session
  )
  if (!free.length) return {}
  return sessions[free[0]]
}

const getNetworkAddress = () => {
  const networkInterfaces = os.networkInterfaces()
  for (const name of Object.keys(networkInterfaces)) {
    for (const networkInterface of networkInterfaces[name]) {
      const { address, family, internal } = networkInterface
      if (family === 'IPv4' && !internal) {
        return address
      }
    }
  }
}

const port = Number(process.env.PORT || process.argv.slice(2)[0] || 9229)

const server = new http.Server()

server.on('request', async function onRequest (req, res) {
  try {
    if (req.url === '/ping') {
      res.end()
    } else if (req.url === '/session') {
      if (req.method !== 'POST') {
        res.writeHead(httpStatus('Method Not Allowed'))
        res.end()
        return
      }
      let data = ''
      for await (const chunk of req) {
        data += chunk.toString()
      }
      const { json, version } = JSON.parse(data)
      const replacePort = x => x.replace(/:9229/g, ':' + port)
      json[0].devtoolsFrontendUrl = replacePort(json[0].devtoolsFrontendUrl)
      json[0].webSocketDebuggerUrl = replacePort(json[0].webSocketDebuggerUrl)
      const { id } = json[0]
      const { debug, session } = sessions[id] || {}
      if (debug) debug.close()
      if (session) session.close()
      sessions[id] = { json, version, debug: null, session: null, id }
      console.log(JSON.stringify({ json, version }, null, 2))
      res.end()
    } else if (req.url === '/json') {
      if (req.method !== 'GET') {
        res.writeHead(httpStatus('Method Not Allowed'))
        res.end()
        return
      }
      const { json } = freeSession()
      if (json) {
        res.writeHead(httpStatus('OK'), {
          'Content-Type': 'application/json'
        })
        return res.end(JSON.stringify(json))
      } else {
        res.writeHead(httpStatus('Not Found'))
        res.end()
      }
    } else if (req.url === '/json/version') {
      if (req.method !== 'GET') {
        res.writeHead(httpStatus('Method Not Allowed'))
        res.end()
        return
      }
      const { version } = freeSession()
      if (version) {
        res.writeHead(httpStatus('OK'), {
          'Content-Type': 'application/json'
        })
        return res.end(JSON.stringify(version))
      } else {
        res.writeHead(httpStatus('Not Found'))
        res.end()
      }
    }
  } catch (err) {
    console.error(err)
    if (!res.headersSent) {
      res.writeHead(httpStatus('Internal Server Error'))
      res.end()
    }
  }
})

server.on('listening', function listening () {
  const ip = getNetworkAddress()
  const ipPort = `${ip}:${port}`.padEnd(20, ' ')
  const ngrokPort = `${port}`.padEnd(4, ' ')
  console.log(`
\x1B[32m   ┌──────────────────────────────────────────────────┐
\x1B[32m   │\x1B[0m                                                  \x1B[32m│
\x1B[32m   │\x1B[0m   Debug server started!                          \x1B[32m│
\x1B[32m   │\x1B[0m                                                  \x1B[32m│
\x1B[32m   │\x1B[0m   - To debug a new process:                      \x1B[32m│
\x1B[32m   │\x1B[0m     export DEBUG_PROXY=${ipPort}      \x1B[32m│
\x1B[32m   │\x1B[0m     node index.js                                \x1B[32m│
\x1B[32m   │\x1B[0m                                                  \x1B[32m│
\x1B[32m   │\x1B[0m   - To debug an existing process:                \x1B[32m│
\x1B[32m   │\x1B[0m     export DEBUG_PROXY=${ipPort}      \x1b[32m│
\x1B[32m   │\x1B[0m     export DEBUG_PID=<pid of node process>       \x1B[32m│
\x1B[32m   │\x1B[0m     npx sandbox-debugger                         \x1B[32m│
\x1B[32m   │\x1B[0m                                                  \x1B[32m│
\x1B[32m   │\x1B[0m   - Find pid of first running Node.js process:   \x1B[32m│
\x1B[32m   │\x1B[0m     ps ax |                                      \x1B[32m│
\x1B[32m   │\x1B[0m     grep 'no[d]e ' |                             \x1B[32m│
\x1B[32m   │\x1B[0m     awk '{print $1}' |                           \x1B[32m│
\x1B[32m   │\x1B[0m     head -n 1                                    \x1B[32m│
\x1B[32m   │\x1B[0m                                                  \x1B[32m│
\x1B[32m   │\x1B[0m   - Allow remote access to me:                   \x1B[32m│
\x1B[32m   │\x1B[0m     npx ngrok http ${ngrokPort}                          \x1B[32m│
\x1B[32m   │\x1B[0m                                                  \x1B[32m│
\x1B[32m   └──────────────────────────────────────────────────┘
\x1B[0m`)
})

const wss = new WebSocket.Server({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    if (req.url === '/session') {
      const session = freeSession()

      if (!session.id) {
        ws.close()
        console.error("session couldn't be created")
        return
      }

      console.log('%s session created', session.id)
      session.session = ws
      session.session.send('debug!')

      session.session.once('close', () => {
        console.log('%s session closed', session.id)
        delete session.session
        if (session.debug) session.debug.close()
      })
    } else {
      const session = freeDebug()
      if (!session.id) {
        ws.close()
        console.error(
          "debug could'nt be started, no free session available %j",
          sessions
        )
        return
      }
      console.log('%s debug started', session.id)
      session.debug = ws
      session.debug.on('message', message => {
        if (session.session) session.session.send(message.toString())
      })
      session.session.on('message', message => {
        if (session.debug) session.debug.send(message.toString())
      })
      session.debug.once('close', () => {
        console.log('%s debug closed', session.id)
        delete session.debug
        if (session.session) session.session.close()
        delete sessions[session.id]
      })
    }
  })
})

server.listen(port)
