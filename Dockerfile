FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .
RUN g++ -std=c++17 -O2 -o complaint_processor complaint_processor.cpp

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
