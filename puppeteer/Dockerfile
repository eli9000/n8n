FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN apk update && apk add --no-cache chromium && npm install
COPY index.js .
CMD ["node", "index.js"]