# ─── Etapa 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Instalar pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Construir frontend + backend
RUN pnpm build

# ─── Etapa 2: Producción ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar dependencias de producción
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copiar artefactos de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Variables de entorno por defecto (sobreescribir en docker-compose o .env)
ENV NODE_ENV=production
ENV PORT=3000
ENV LOCAL_AUTH=true

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/auth/mode || exit 1

CMD ["node", "dist/index.js"]
