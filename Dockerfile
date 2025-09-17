FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm install --omit=dev && \
    cd server && npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
