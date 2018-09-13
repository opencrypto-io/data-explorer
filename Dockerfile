FROM node:alpine

WORKDIR /corn/data-explorer

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 1234

CMD [ "npm", "run-script", "serve" ]

