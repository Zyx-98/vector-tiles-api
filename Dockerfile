FROM node:22.21-alpine3.21 AS base

RUN apk add --no-cache \
    postgresql-client \
    postgis

WORKDIR /usr/src/app

COPY package*.json ./

FROM base AS development

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=development

CMD ["npm", "run", "dev"]

FROM base AS build

RUN npm install

COPY . .

RUN npm run build

FROM base AS production

RUN npm ci --only=production

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]