let sessionJSON

const WebSocket = require('ws')
const serverBase = require('server-base')
const log = serverBase.log('debug21')

const server = serverBase({
  '@setup' (ctx) {
    ctx.middlewareFunctions = []
  },
  '/session': {
    async post (req, res) {
      const { json, version } = await req.json({ log: true })
      const replacePort = x => x.replace(/:9229/g, ':' + process.env.PORT)
      json[0].devtoolsFrontendUrl = replacePort(json[0].devtoolsFrontendUrl)
      json[0].webSocketDebuggerUrl = replacePort(json[0].webSocketDebuggerUrl)
      sessionJSON = { json, version }
      res.end()
    }
  },
  '/json': {
    get (req, res) {
      if (!sessionJSON) return res.writeHead(404)
      res.json(sessionJSON.json)
    }
  },
  '/json/version': {
    get (req, res) {
      if (!sessionJSON) return res.writeHead(404)
      res.json(sessionJSON.version)
    }
  }
}).start()

let sessionWS
const wss = new WebSocket.Server({ noServer: true })

const close = name => () => {
  log.info('connection closed by %s', name)
}

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    if (req.url === '/session') {
      sessionWS = ws
      sessionWS.send('debug!')
      sessionWS.on('close', close('remote session'))
    } else {
      sessionWS.on('message', message => ws.send(message))
      ws.on('message', message => sessionWS.send(message))
      ws.on('close', close('remote debug socket'))
    }
  })
})
