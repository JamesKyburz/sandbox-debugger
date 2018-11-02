#!/usr/bin/env node

const fetch = require('node-fetch')
const WebSocket = require('ws')
const delay = require('delay')
const { fork, execSync } = require('child_process')
const tempy = require('tempy')
const touch = require('touch')
const fs = require('fs')

const { DEBUG_PROXY } = process.env

if (!DEBUG_PROXY) throw new TypeError('missing DEBUG_PROXY')

const stdio = process.env.DEBUG ? 'inherit' : 'ignore'

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
    const lockfile = tempy.file()
    const ps = fork(__filename, {
      env: {
        ...process.env,
        __DEBUG_PID__: process.env.DEBUG_PID || process.pid,
        __DEBUG_LOCK__: lockfile
      },
      stdio
    })
    ps.on('exit', () => process.exit(0))
    const waitForLockfile = () => {
      while (true) {
        try {
          fs.statSync(lockfile)
          break
        } catch (e) {}
        execSync(`node -e 'setTimeout(f => f, 100)'`)
      }
    }
    if (module.parent) {
      module.exports = waitForLockfile()
    }
  }
}

async function startDebug () {
  const ps = fork(__filename, {
    env: { ...process.env, __DEBUG__: true },
    stdio
  })
  ps.send({ pid: process.env.__DEBUG_PID__ })
  ps.on('exit', () => process.exit(0))
  const proxy = process.env.DEBUG_PROXY

  while (true) {
    try {
      const getJSON = url => fetch(url).then(res => res.json())
      const version = await getJSON('http://localhost:9229/json/version')
      const json = await getJSON('http://localhost:9229/json')
      const session = JSON.stringify({ json, version })
      await fetch(`http://${proxy}/session`, {
        body: session,
        method: 'POST'
      })

      const remote = new WebSocket(`ws://${proxy}/session`)
      const local = new WebSocket(json[0].webSocketDebuggerUrl)
      const close = name => () => {
        console.log('connection closed by %s', name)
        process.kill(+process.env.__DEBUG_PID__)
        process.exit(1)
      }

      remote.once('close', close('remote'))
      remote.once('message', message => {
        remote.once('message', () => {
          touch.sync(process.env.__DEBUG_LOCK__)
        })
        remote.on('message', message => local.send(message))
        local.on('message', message => remote.send(message))

        local.once('close', close('local'))
      })

      break
    } catch (e) {
      await delay(100)
    }
  }
}
