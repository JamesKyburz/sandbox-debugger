# sandbox-debugger

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![build status](https://api.travis-ci.org/JamesKyburz/sandbox-debugger.svg)](https://travis-ci.org/JamesKyburz/sandbox-debugger)
[![Docker Build Status](https://img.shields.io/docker/build/jameskyburz/node-sandbox-debugger.svg)]()
[![downloads](https://img.shields.io/npm/dm/sandbox-debugger-server.svg)](https://npmjs.org/package/sandbox-debugger-server)
[![Docker Pulls](https://img.shields.io/docker/pulls/jameskyburz/node-sandbox-debugger.svg)]()
[![Greenkeeper badge](https://badges.greenkeeper.io/JamesKyburz/sandbox-debugger.svg)](https://greenkeeper.io/)

Debug a [Node.js](https://nodejs.org/en/) process anywhere using `chrome://inspect` or `node-inspect`

| node debug port 9229 | ⟷ | sandbox debug client | ⟷ | sandbox debug broker |
| :--                  | :-:  | --:                  | --:  | --:                  |

Interactive debugging using [inspect](https://nodejs.org/de/docs/guides/debugging-getting-started/), debug the same way you do with a local process.

- [x] a process on a machine you can't ssh / don't have access to
- [x] a process running in a docker container with no exposed ports
- [x] a process running on [travis ci](https://travis-ci.org/)
- [x] AWS Lambda (https://aws.amazon.com/lambda/)
- [x] anywhere that allowes outbound internet traffic to port 443

How it works?

Node opens a websocket when in debug mode, both the sandbox server and client work by piping the websocket data via the broker.

## Run sandbox server

The server is used as a gatekeeper for the debug messages.

```sh
npx sandbox-debugger-server
```

or

```sh
ᐅ docker run \
  --name node-sandbox-debugger \
  -ti \
  --rm \
  -p 9229:9229 \
  jameskyburz/node-sandbox-debugger
```

The server will output

```sh
   Debug server started!                       
                                               
    - To debug a new process:                  
      export DEBUG_PROXY=xxx.xxx.x.xxx:9229    
      node index.js                            
                                               
    - To debug an existing process:            
      export DEBUG_PROXY=xxx.xxx.x.xxx:9229    
      export DEBUG_PID=<pid of node process>   
      npx sandbox-debugger                     
                                               
     - Allow remove access to me:              
      npx ngrok http 9229                      
```

## Create a tunnel to our sandbox server process

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

<a href="https://asciinema.org/a/285819?autoplay=1&speed=2&size=small&preload=1"><img src="https://asciinema.org/a/285819.png" width="100%"/></a>

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

<a href="https://asciinema.org/a/285820?autoplay=1&speed=2&size=small&preload=1"><img src="https://asciinema.org/a/285820.png" width="100%"/></a>

## AWS Lambda

The easiest way to debug lambda is to edit the code in aws console.

* Copy the contents of `https://unpkg.com/sandbox-debugger@latest/dist/index.js` to debug.js
* `require('./debug.js')` instead of `sandbox-debugger`



# license

[Apache License, Version 2.0](LICENSE)
