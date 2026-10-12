FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
RUN pnpm exec playwright install --with-deps chromium
COPY . .
ARG CONTENT_API_URL
ARG CONTENT_MEDIA_ORIGIN
ENV CONTENT_API_URL=${CONTENT_API_URL} CONTENT_MEDIA_ORIGIN=${CONTENT_MEDIA_ORIGIN}
RUN test -n "$CONTENT_API_URL" && test -n "$CONTENT_MEDIA_ORIGIN" && pnpm build

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
