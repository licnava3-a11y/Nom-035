# ─── Etapa 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Instalar pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar dependencias (sin descargar Chromium — puppeteer usa import dinámico en runtime)
# PUPPETEER_SKIP_DOWNLOAD evita que puppeteer descargue Chromium (~170MB) durante pnpm install
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Construir frontend + backend
RUN pnpm build

# ─── Etapa 2: Producción ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Instalar Chromium del sistema Alpine (mucho más pequeño que el de puppeteer)
# y dependencias necesarias para renderizado headless
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar dependencias de producción (sin descargar Chromium)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN pnpm install --frozen-lockfile --prod

# Copiar artefactos de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Variables de entorno por defecto (sobreescribir en docker-compose o .env)
ENV NODE_ENV=production
ENV PORT=3000
# LOCAL_AUTH=true solo para desarrollo local sin OAuth. En produccion se usa Manus OAuth.
# NO establecer LOCAL_AUTH aqui — las variables de entorno de produccion lo inyectan si es necesario.
# Apuntar puppeteer al Chromium del sistema Alpine
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3000

# Healthcheck universal — funciona en modo OAuth y LOCAL_AUTH
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
