FROM node:12

ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm ci --production

COPY . .

COPY --from=gcastilho/common:latest /app /common

CMD ["node", "index.js"]
