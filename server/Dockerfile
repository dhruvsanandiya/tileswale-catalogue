FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat && \
    cd /usr/lib && ln -sf libssl.so.3 libssl.so.1.1 && ln -sf libcrypto.so.3 libcrypto.so.1.1

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
