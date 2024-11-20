FROM node:18.12.1
WORKDIR /snap4blockchain-api
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 9999
CMD [ "node", "apiserver.js"]
