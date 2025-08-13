# Node 20-alpine for small image
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --production
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
