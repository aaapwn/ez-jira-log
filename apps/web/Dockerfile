FROM oven/bun:1 AS build

ARG VITE_SERVER_URL=""
ARG VITE_VAPID_PUBLIC_KEY=""
ARG NODE_ENV=production

ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV NODE_ENV=$NODE_ENV
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

WORKDIR /app

COPY . .

RUN bun install

RUN cd apps/web && bun run build

FROM nginx:alpine AS production

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

COPY config/nginx.frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
