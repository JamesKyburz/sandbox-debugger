#!/usr/bin/env node

const sessions = {}

if (process.env.PORT === undefined) process.env.PORT = 9229
if (process.env.LOG_PRETTY === undefined) process.env.LOG_PRETTY = true

const WebSocket = require('ws')
const serverBase = require('server-base')
const os = require('os')
const chalk = require('chalk')
const boxen = require('boxen')
const log = serverBase.log('sandbox-debugger/server')

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

const port = process.env.PORT || process.argv.slice(2)[0]

const server = serverBase(require('../package.json').name, {
  '@setup' (ctx) {
    ctx.middlewareFunctions = []
  },
  '/session': {
    async post (req, res) {
      const { json, version } = await req.json({ log: true })
      const replacePort = x => x.replace(/:9229/g, ':' + process.env.PORT)
      json[0].devtoolsFrontendUrl = replacePort(json[0].devtoolsFrontendUrl)
      json[0].webSocketDebuggerUrl = replacePort(json[0].webSocketDebuggerUrl)
      const { id } = json[0]
      const { debug, session } = sessions[id] || {}
      if (debug) debug.close()
      if (session) session.close()
      sessions[id] = { json, version, debug: null, session: null, id }
      res.end()
    }
  },
  '/json': {
    get (req, res) {
      const { json } = freeSession()
      if (json) return res.json(json)
      res.writeHead(404)
      res.end()
    }
  },
  '/json/version': {
    get (req, res) {
      const { version } = freeSession()
      if (version) return res.json(version)
      res.writeHead(404)
      res.end()
    }
  }
}).start(port)

server.on('listening', () => {
  const ip = getNetworkAddress()
  const port = process.env.PORT || 9229
  let message = chalk.green('Debug server started!')

  message += `\n\n${chalk.bold(
    ' - To debug a new process that explicitly requires sandbox-debugger:'
  )} DEBUG_PROXY=${ip}:${port} node index.js`
  message += `\n\n${chalk.bold(
    ' - To debug an existing process:'
  )} DEBUG_PROXY=${ip}:${port} DEBUG_PID=pid npx sandbox-debugger`

  console.log(
    boxen(message, {
      padding: 1,
      borderColor: 'green',
      margin: 1
    })
  )
})

const wss = new WebSocket.Server({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    if (req.url === '/session') {
      const session = freeSession()

      if (!session.id) {
        ws.close()
        log.error("session couldn't be created")
        return
      }

      log.info('%s session created', session.id)
      session.session = ws
      session.session.send('debug!')

      session.session.once('close', () => {
        log.info('%s session closed', session.id)
        delete session.session
        if (session.debug) session.debug.close()
      })
    } else {
      const session = freeDebug()
      if (!session.id) {
        ws.close()
        log.error(
          "debug could'nt be started, no free session available %j",
          sessions
        )
        return
      }
      log.info('%s debug started', session.id)
      session.debug = ws
      session.debug.on('message', message => {
        if (session.session) session.session.send(message)
      })
      session.session.on('message', message => {
        if (session.debug) session.debug.send(message)
      })
      session.debug.once('close', () => {
        log.info('%s debug closed', session.id)
        delete session.debug
        if (session.session) session.session.close()
        delete sessions[session.id]
      })
    }
  })
})
