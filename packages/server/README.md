# sandbox-debugger

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![build status](https://api.travis-ci.com/JamesKyburz/sandbox-debugger.svg)](https://travis-ci.com/JamesKyburz/sandbox-debugger)
[![Docker Image CI](https://github.com/JamesKyburz/sandbox-debugger/workflows/Docker%20Image%20CI/badge.svg?branch=master)](https://github.com/JamesKyburz/sandbox-debugger/actions?query=workflow%3A%22Docker+Image+CI%22)
[![downloads](https://img.shields.io/npm/dm/sandbox-debugger-server.svg)](https://npmjs.org/package/sandbox-debugger-server)
[![Docker Pulls](https://img.shields.io/docker/pulls/jameskyburz/node-sandbox-debugger.svg)](https://hub.docker.com/r/jameskyburz/sandbox-debugger)

Debug a [Node.js](https://nodejs.org) process anywhere using `chrome://inspect` or `node-inspect`

| node debug port 9229 | ⟷ | sandbox debug client | ⟷ | sandbox debug broker |
| :--                  | :-:  | --:                  | --:  | --:                  |

Interactive debugging using [inspect](https://nodejs.org/de/docs/guides/debugging-getting-started/), debug the same way you do with a local process.

Supports a [Node.js](https://nodejs.org) process running

- [x] on a machine you can't ssh / don't have access to
- [x] in a Docker Container with no exposed ports
- [x] on [Travis CI](https://travis-ci.com/)
- [x] on [Github Actions](https://github.com/features/actions)
- [x] on [Bitbucket Pipelines](https://bitbucket.org/product/features/pipelines)
- [x] on [GitLab CI/CD](https://about.gitlab.com/stages-devops-lifecycle/continuous-integration/)
- [x] on [AWS CodeBuild](https://aws.amazon.com/codebuild/)
- [x] on [AWS Lambda](https://aws.amazon.com/lambda/)
- [x] on [Heroku](https://www.heroku.com/)
- [x] anywhere that allows outbound internet traffic to port 80

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
  --name sandbox-debugger \
  -ti \
  --rm \
  -p 9229:9229 \
  jameskyburz/sandbox-debugger
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

    - Find pid of first running Node.js process
      ps ax |
      grep 'no[d]e ' |
      awk '{print $1}' |
      head -n 1
                                               
    - Allow remote access to me:              
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

<a href="https://asciinema.org/a/291811?autoplay=1&speed=2&size=small&preload=1"><img src="https://asciinema.org/a/291811.png" width="100%"/></a>

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

<a href="https://asciinema.org/a/291814?autoplay=1&speed=2&size=small&preload=1"><img src="https://asciinema.org/a/291814.png" width="100%"/></a>

## AWS Lambda

Environment variable `DEBUG_PROXY` needs to point to the `ngrok` address including the port part `:80`.

The easiest way to debug lambda is to edit the code in aws console.

* Copy the contents of `https://unpkg.com/sandbox-debugger@latest/dist/index.js` to debug.js
* `require('./debug.js')` instead of `sandbox-debugger`

or

Use a [lambda layer](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html) containing the `sandbox-debugger`, you can publish your own for node 12 [here](https://github.com/JamesKyburz/aws-lambda-layers/blob/master/node/12.x/sandbox-debugger/publish.sh) and also node 10 [here](https://github.com/JamesKyburz/aws-lambda-layers/blob/master/node/10.x/sandbox-debugger/publish.sh).

# license

[Apache License, Version 2.0](LICENSE)
