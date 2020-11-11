FROM node:12

# Tell node we're in production; Improves performance
ENV NODE_ENV=production

# Folder inside the image that the files will be in
WORKDIR /app

COPY ["package.json", "package-lock.json", "./"]

RUN npm ci --production

COPY . .

CMD ["node", "index.js"]
