# sandbox-debugger

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![build status](https://api.travis-ci.org/JamesKyburz/sandbox-debugger.svg)](https://travis-ci.org/JamesKyburz/sandbox-debugger)
[![Docker Build Status](https://img.shields.io/docker/build/jameskyburz/node-sandbox-debugger.svg)]()
[![downloads](https://img.shields.io/npm/dm/sandbox-debugger-server.svg)](https://npmjs.org/package/sandbox-debugger-server)
[![Docker Pulls](https://img.shields.io/docker/pulls/jameskyburz/node-sandbox-debugger.svg)]()
[![Greenkeeper badge](https://badges.greenkeeper.io/JamesKyburz/sandbox-debugger.svg)](https://greenkeeper.io/)

A reverse proxy debugger.
Debug a remote node process on a machine you can't SSH tunnel to.

e.g AWS lambda.

```
┌────────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
│ node process port 9229 │<--->│ sandbox server client │<--->│ sandbox server broker │
└────────────────────────┘     └───────────────────────┘     └───────────────────────┘
```

Node opens a websocket when in debug mode, both the sandbox server and client work by piping the websocket data via the broker.

# HTTP & WebSocket broker

## Run locally

```sh
PORT=9229 npx sandbox-debugger-server
```

## Running broker in Docker

Docker images hosted at https://hub.docker.com/r/jameskyburz/node-sandbox-debugger

```sh
ᐅ docker run \
  --name node-sandbox-debugger \
  -ti \
  --rm \
  -e PORT=9229 \
  -e LOG_PRETTY=1 \
  -p 9229:9229 \
  jameskyburz/node-sandbox-debugger
```

## Reverse proxy

Using [ngrok](https://npm.im/ngrok) you can tunnel to the locally running broker from for example aws lambda.

```sh
npx ngrok http 9229
```

# Client 

## Example debug current process

```javascript
// index.js
require('sandbox-debugger')
debugger
console.log('all done')
```

```sh
# DEBUG_PROXY is ip:port to sandbox broker
DEBUG_PROXY=ip:port node index.js
```

## Example debug an already running process

```sh
# DEBUG_PROXY is ip:port to sandbox broker
# DEBUG_PID is pid of process to debug
DEBUG_PROXY=ip:port DEBUG_PID=x npx sandbox-debugger
```

# license

[Apache License, Version 2.0](LICENSE)
