FROM node:20-alpine

RUN npm config set proxy http://192.168.205.251:3128
RUN npm config set https-proxy http://192.168.205.251:3128
ENV proxy http://192.168.205.251:3128
ENV https_proxy http://192.168.205.251:3128
ENV no_proxy 192.168.208.84,192.168.208.87

ENV TZ US/Eastern

WORKDIR /app
COPY ./package.json ./
RUN npm install .

COPY . .
RUN npm run build

CMD ["npm", "run", "start"]

