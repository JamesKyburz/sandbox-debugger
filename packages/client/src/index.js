#!/usr/bin/env node

'use strict'

const WebSocket = require('ws')
const http = require('http')
const { fork } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { DEBUG_PROXY, DEBUG_PID, DEBUG } = process.env

const env = process.env.__DEBUG_CHILD__
  ? { ...process.env }
  : {
      __DEBUG_CHILD__: true,
      __DEBUG_PROXY__: process.env.DEBUG_PROXY,
      __DEBUG_PID__: process.env.DEBUG_PID,
      __DEBUG_STDIO__: process.env.DEBUG ? 'inherit' : 'ignore'
    }

if (!env.__DEBUG_PROXY__) throw new TypeError('missing DEBUG_PROXY')

const stdio = env.__DEBUG_STDIO__

if (process.env.__DEBUG__) {
  process.on('message', ({ pid }) => {
    process._debugProcess(+pid)
  })
} else {
  if (process.env.__DEBUG_PID__) {
    startDebug().catch(err => {
      console.error('start debug error', err)
      process.exit(1)
    })
  } else {
    const lockfile = path.join(
      os.tmpdir(),
      `sandbox-debugger-lock-${Date.now().toString(32)}`
    )
    const ps = fork(__filename, {
      env: {
        ...env,
        __DEBUG_PID__: env.__DEBUG_PID__ || process.pid,
        __DEBUG_LOCK__: lockfile
      },
      stdio
    })
    ps.on('exit', () => process.exit(0))
    while (true) {
      try {
        fs.statSync(lockfile)
        break
      } catch (e) {}
      blockingSleep(500)
    }
  }
}

async function startDebug () {
  const ps = fork(__filename, {
    env: { ...env, __DEBUG__: true },
    stdio
  })
  ps.send({ pid: process.env.__DEBUG_PID__ })
  ps.on('exit', () => process.exit(0))
  const proxy = process.env.__DEBUG_PROXY__
  const localEndpoint = 'http://localhost:9229'

  while (true) {
    try {
      const version = await getLocalDebugger(`${localEndpoint}/json/version`)
      const json = await getLocalDebugger(`${localEndpoint}/json`)
      const session = JSON.stringify({ json, version })
      await postSession(`http://${proxy}/session`, session)
      const remote = new WebSocket(`ws://${proxy}/session`)
      const local = new WebSocket(json[0].webSocketDebuggerUrl)
      const close = name => () => {
        console.log('connection closed by %s', name)
        process.kill(+process.env.__DEBUG_PID__)
        process.exit(1)
      }

      remote.once('error', err => {
        console.error(err)
        close('remote')
      })

      remote.once('close', close('remote'))
      remote.once('message', message => {
        remote.once('message', () => {
          fs.writeFileSync(process.env.__DEBUG_LOCK__, '')
        })
        remote.on('message', message => {
          local.send(message.toString())
        })
        local.on('message', message => {
          remote.send(message.toString())
        })

        local.once('close', close('local'))
      })

      break
    } catch (e) {
      await delay(100)
    }
  }
}

async function getLocalDebugger (url) {
  const res = await new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      res.on('error', reject)
      res.setEncoding('utf8')
      resolve(res)
    })
    req.on('error', reject)
  })
  if (res.statusCode !== 200) {
    throw new Error(`${url} returned ${res.statusCode}`)
  }
  let data = ''
  for await (const chunk of res) {
    data += chunk.toString()
  }
  return JSON.parse(data)
}

async function postSession (url, postData) {
  await new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      res => {
        if (res.statusCode > 299) {
          reject(new Error(`${url} returned ${res.statusCode}`))
        } else {
          res.on('error', reject)
          res.on('data', () => null)
          res.on('end', resolve)
        }
      }
    )
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

function blockingSleep (s) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(s / 1000))
}

function delay (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}
