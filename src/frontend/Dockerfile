FROM node:22-alpine AS build

WORKDIR /app

ARG NEXT_PUBLIC_GAME_WS_URL=http://localhost:8080
ENV NEXT_PUBLIC_GAME_WS_URL=$NEXT_PUBLIC_GAME_WS_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/out /usr/share/nginx/html/ginrummy

EXPOSE 80
