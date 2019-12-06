const { test } = require('tap')
const { fork, spawn } = require('child_process')
const WebSocket = require('ws')
const fetch = require('node-fetch')

const broker = require.resolve('sandbox-debugger-server')
const clientStart = require.resolve('sandbox-debugger')
const anotherProcess = require.resolve('./fixtures/another-process')

const stdio = process.env.DEBUG ? 'inherit' : 'ignore'

let server
let client

test('start sandbox-debugger http/ws broker', async t => {
  server = spawn('node', [broker], { stdio, env: { PORT: 9228 } })
  process.on('exit', server.kill.bind(server))
  while (true) {
    if (await fetch('http://localhost:9228/ping').catch(f => false)) break
    await new Promise((resolve, reject) => setTimeout(resolve, 100))
  }
})

test('sandbox broker responds 404 when no debug session available', async t => {
  const res = await fetch('http://localhost:9228/json/version')
  t.equals(404, res.status)
})

test('create debug session with external process', async t => {
  client = fork(anotherProcess, {
    stdio
  })
  fork(clientStart, {
    stdio,
    env: {
      DEBUG_PROXY: 'localhost:9228',
      DEBUG_PID: client.pid
    }
  })

  while (true) {
    if (
      (await fetch('http://localhost:9228/json/version').then(
        r => r.status
      )) === 200
    ) {
      break
    }
    await new Promise((resolve, reject) => setTimeout(resolve, 100))
  }
})

test('debug commands are piped to broker', async t => {
  const { webSocketDebuggerUrl } = (await fetch(
    'http://localhost:9228/json'
  ).then(r => r.json()))[0]
  const ws = new WebSocket(webSocketDebuggerUrl)
  const init = [
    { id: 1, method: 'Profiler.enable' },
    { id: 2, method: 'Runtime.enable' },
    { id: 3, method: 'Debugger.enable' }
  ]
  await new Promise((resolve, reject) => {
    ws.once('message', message => {
      t.equals(message, JSON.stringify({ id: 1, result: {} }))
      resolve()
    })
    ws.once('open', () => {
      for (const message of init) {
        ws.send(JSON.stringify(message))
      }
    })
  })
})

test('stop sandbox-debugger http/ws broker', async t => {
  await new Promise((resolve, reject) => {
    client.on('close', resolve)
    if (server) server.kill()
  })
})
