FROM node:22

WORKDIR /app

COPY . .

RUN npm install

RUN chmod +x /app/node_modules/.bin/vite

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]