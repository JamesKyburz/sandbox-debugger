FROM node:lts-alpine3.13

LABEL maintainer="James Kyburz james.kyburz@gmail.com"

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .

RUN npm i npm@latest -g
RUN npm i

COPY . .

ENTRYPOINT ["node", "--unhandled-rejections=strict", "src/index.js"]
CMD []

EXPOSE 9229
