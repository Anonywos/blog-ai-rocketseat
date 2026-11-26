FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=8080

USER node

EXPOSE 8080

CMD ["node", "src/index.js"]
