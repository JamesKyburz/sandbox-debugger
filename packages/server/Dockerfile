FROM node:12.14.1-alpine3.11

LABEL maintainer="James Kyburz james.kyburz@gmail.com"

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .

RUN npm i

COPY . .

ENTRYPOINT ["node", "src/index"]
CMD []

EXPOSE 9229
