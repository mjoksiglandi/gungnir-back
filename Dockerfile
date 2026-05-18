FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && node dist/main.js"]
