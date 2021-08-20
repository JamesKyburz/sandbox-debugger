const { test } = require('tap')
const { fork, spawn } = require('child_process')
const WebSocket = require('ws')
const fetch = require('node-fetch')

const broker = require.resolve('./test-broker')
const sameProcess = require.resolve('./fixtures/same-process')

const stdio = process.env.DEBUG ? 'inherit' : 'ignore'

let server
let client

if (!process.env.NO_SERVER) {
  test('start sandbox-debugger http/ws broker', async t => {
    server = spawn('node', [broker], { stdio })
    process.on('exit', server.kill.bind(server))
  })
}

test('wait for broker to be ready', async t => {
  while (true) {
    if (await fetch('http://localhost:9228/ping').catch(f => false)) break
    await new Promise((resolve, reject) => setTimeout(resolve, 100))
  }
})

test('wait for broker to be read', async t => {
  while (true) {
    if (await fetch('http://localhost:9228/ping').catch(f => false)) break
    await new Promise((resolve, reject) => setTimeout(resolve, 100))
  }
})

test('sandbox broker responds 404 when no debug session available', async t => {
  const res = await fetch('http://localhost:9228/json/version')
  t.equal(404, res.status)
})

test('create debug session with inline process', async t => {
  client = fork(sameProcess, {
    stdio,
    env: {
      DEBUG_PROXY: 'localhost:9228'
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

test('sandbox broker responds to /json/version', async t => {
  const res = await fetch('http://localhost:9228/json/version')
  t.equal(200, res.status, 'status is 200')
  const { Browser: browser, 'Protocol-Version': version } = await res.json()
  t.ok(browser, 'response has browser')
  t.ok(version, 'response has version')
})

test('sandbox broker responds to /json', async t => {
  const res = await fetch('http://localhost:9228/json')
  t.equal(200, res.status, 'status is 200')
  const json = await res.json()
  const { id, webSocketDebuggerUrl } = json[0]
  t.ok(id, 'response has id')
  t.ok(webSocketDebuggerUrl, 'response has webSocketDebuggerUrl')
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
      t.equal(message.toString(), JSON.stringify({ id: 1, result: {} }))
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
    client.once('close', resolve)
    if (server) {
      server.kill()
    } else {
      client.kill('SIGTERM')
    }
  })
})
