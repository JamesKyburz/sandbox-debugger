# sandbox-debugger-server

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![Docker Build Status](https://img.shields.io/docker/build/jameskyburz/node-sandbox-debugger.svg)]()
[![downloads](https://img.shields.io/npm/dm/sandbox-debugger-server.svg)](https://npmjs.org/package/sandbox-debugger-server)
[![Docker Pulls](https://img.shields.io/docker/pulls/jameskyburz/node-sandbox-debugger.svg)]()

# Node

```sh
npm start
```

# Docker

Docker images hosted at https://hub.docker.com/r/jameskyburz/node-sandbox-debugger

docker pull jameskyburz/node-sandbox-debugger:0.0.1

# Running in docker

```sh
ᐅ docker run \
  --name node-sandbox-debugger \
  -e PORT=9229
  -e LOG_PRETTY=1
  -p 9229:9229
  jameskyburz/node-sandbox-debugger:0.0.1
```

# license

[Apache License, Version 2.0](LICENSE)
