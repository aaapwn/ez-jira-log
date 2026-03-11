FROM oven/bun:1 AS build

ARG DATABASE_URL

ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

COPY . .

RUN bun install

ENV NODE_ENV=production

RUN bunx turbo db:generate

RUN bun build \
    --compile \
    --minify-whitespace \
    --minify-syntax \
    --target bun \
    --outfile server \
    ./apps/server/src/index.ts

FROM gcr.io/distroless/cc-debian12 AS production

WORKDIR /app

COPY --from=build /app/server /app/server
COPY --from=build /app/packages/db/prisma /app/packages/db/prisma

EXPOSE 3000

CMD ["./server"]
