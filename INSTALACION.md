# Guía de Instalación — Plataforma NOM-035 STPS 2018

> **Versión:** 1.1 | **Stack:** Node.js 22 + React 19 + MySQL 8 + TypeScript + tRPC

Esta guía cubre tres métodos de instalación: automático (recomendado), con Docker Compose, y manual paso a paso.

---

## Requisitos del Servidor

| Componente | Mínimo                     | Recomendado      |
| ---------- | -------------------------- | ---------------- |
| CPU        | 2 núcleos                  | 4 núcleos        |
| RAM        | 2 GB                       | 4 GB             |
| Disco      | 20 GB SSD                  | 50 GB SSD        |
| OS         | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| Node.js    | 22.x                       | 22.x LTS         |
| MySQL      | 8.0                        | 8.0              |

---

## Método 1: Instalación Automática (Recomendado)

El script `install.sh` instala y configura todo automáticamente en Ubuntu/Debian.

```bash
# 1. Descomprimir el proyecto
unzip nom035_platform_v1.0.zip
cd nom035_platform/

# 2. Dar permisos de ejecución
chmod +x scripts/install.sh

# 3. Ejecutar como root
sudo ./scripts/install.sh
```

El script instala automáticamente: Node.js 22, pnpm, PM2, MySQL 8, Nginx y configura el firewall. Al finalizar, solicita crear el primer usuario administrador.

---

## Método 2: Docker Compose (Más sencillo)

### Paso 1: Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### Paso 2: Configurar variables de entorno

Crear el archivo `.env` en la raíz del proyecto (ver `CONFIGURACION_ENTORNO.md`):

```bash
# Variables mínimas requeridas:
LOCAL_AUTH=true
DATABASE_URL=mysql://nom035_user:TU_PASSWORD@db:3306/nom035_db
JWT_SECRET=$(openssl rand -hex 32)   # Generar con este comando
MYSQL_ROOT_PASSWORD=TU_ROOT_PASSWORD
MYSQL_DATABASE=nom035_db
MYSQL_USER=nom035_user
MYSQL_PASSWORD=TU_PASSWORD
```

### Paso 3: Iniciar los servicios

```bash
# Solo la aplicación y base de datos
docker compose up -d

# Con Nginx (para producción con dominio propio)
docker compose --profile production up -d
```

### Paso 4: Aplicar migraciones

```bash
docker compose exec app pnpm drizzle-kit migrate
```

### Paso 5: Crear el primer administrador

```bash
docker compose exec app node scripts/setup-admin.mjs
```

### Paso 6: Verificar

```bash
docker compose ps
curl http://localhost:3000/api/auth/mode
# Debe responder: {"mode":"local","localAuthEnabled":true}
```

Acceder en: `http://IP_DEL_SERVIDOR:3000`

---

## Método 3: Instalación Manual

### Paso 1: Instalar Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
node --version  # v22.x.x
```

### Paso 2: Instalar pnpm

```bash
npm install -g pnpm@10.4.1
```

### Paso 3: Instalar y configurar MySQL

```bash
sudo apt-get install -y mysql-server
sudo systemctl enable mysql && sudo systemctl start mysql

# Crear base de datos y usuario
sudo mysql -u root << 'SQL'
CREATE DATABASE nom035_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nom035_user'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURA';
GRANT ALL PRIVILEGES ON nom035_db.* TO 'nom035_user'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### Paso 4: Configurar el proyecto

```bash
unzip nom035_platform_v1.0.zip
cd nom035_platform/
pnpm install
```

Crear el archivo `.env` (ver `CONFIGURACION_ENTORNO.md` para la lista completa):

```bash
LOCAL_AUTH=true
DATABASE_URL=mysql://nom035_user:TU_PASSWORD@localhost:3306/nom035_db
JWT_SECRET=$(openssl rand -hex 32)
PORT=3000
NODE_ENV=production
VITE_APP_TITLE=Plataforma NOM-035 STPS 2018
OWNER_NAME=Administrador del Sistema
VITE_APP_ID=local
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

### Paso 5: Aplicar migraciones

```bash
pnpm drizzle-kit migrate
```

### Paso 6: Compilar la aplicación

```bash
pnpm build
```

### Paso 7: Crear el primer administrador

```bash
node scripts/setup-admin.mjs
```

### Paso 8: Iniciar en producción con PM2

```bash
npm install -g pm2

cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'nom035',
    script: 'dist/index.js',
    env: { NODE_ENV: 'production', PORT: 3000 },
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    error_file: '/var/log/nom035-error.log',
    out_file: '/var/log/nom035-out.log'
  }]
};
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Seguir las instrucciones que muestra
```

### Paso 9: Configurar Nginx

```bash
sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/nom035 << 'NGINX'
server {
    listen 80;
    server_name tudominio.com;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/nom035 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Paso 10: Agregar SSL con Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

---

## Configuración de Correo (SMTP)

Para activar el envío de encuestas y alertas por correo, agregar al `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_contraseña_de_app
SMTP_FROM=noreply@tudominio.com
```

También se puede configurar desde el panel: **Administración → Configuración SMTP**.

---

## Configuración de IA (Opcional)

Para activar análisis de sentimiento y alertas inteligentes con OpenAI o compatible:

```bash
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
BUILT_IN_FORGE_API_KEY=sk-...
```

---

## Comandos Útiles

| Comando                        | Descripción                 |
| ------------------------------ | --------------------------- |
| `pm2 status`                   | Ver estado de la aplicación |
| `pm2 logs nom035`              | Ver logs en tiempo real     |
| `pm2 restart nom035`           | Reiniciar la aplicación     |
| `pnpm drizzle-kit migrate`     | Aplicar migraciones de BD   |
| `node scripts/setup-admin.mjs` | Crear usuario administrador |
| `docker compose logs -f app`   | Logs con Docker             |
| `docker compose restart app`   | Reiniciar con Docker        |
| `pnpm test`                    | Ejecutar tests (386 tests)  |

---

## Actualización del Sistema

```bash
# 1. Detener la aplicación
pm2 stop nom035

# 2. Backup de la BD
mysqldump -u nom035_user -p nom035_db > backup_$(date +%Y%m%d).sql

# 3. Copiar nuevos archivos (conservar .env)
cp /opt/nom035/.env /tmp/nom035.env.bak
rsync -av --exclude='.env' --exclude='node_modules' nueva_version/ /opt/nom035/
cp /tmp/nom035.env.bak /opt/nom035/.env

# 4. Instalar dependencias y compilar
cd /opt/nom035
pnpm install && pnpm build

# 5. Aplicar migraciones
pnpm drizzle-kit migrate

# 6. Reiniciar
pm2 restart nom035
```

---

## Estructura del Proyecto

```
nom035_platform/
├── client/                    # Frontend React 19 + TypeScript
│   └── src/
│       ├── components/        # Componentes reutilizables
│       ├── pages/             # ~60 páginas de la aplicación
│       └── lib/trpc.ts        # Cliente tRPC
├── server/                    # Backend Express + tRPC
│   ├── _core/                 # Infraestructura (auth, trpc, context)
│   │   └── localAuth.ts       # Autenticación local (usuario/contraseña)
│   ├── routers/               # ~30 routers tRPC por módulo
│   ├── jobs/                  # Jobs automáticos (cron)
│   └── db.ts                  # Helpers de base de datos
├── drizzle/                   # Schema y migraciones MySQL
│   ├── schema.ts              # Definición de tablas
│   └── migrations/            # Archivos SQL de migración
├── scripts/
│   ├── install.sh             # Instalación automática Ubuntu/Debian
│   ├── setup-admin.mjs        # Crear primer administrador
│   └── init-db.sql            # Inicialización de BD
├── nginx/
│   └── nginx.conf             # Configuración Nginx con SSL
├── Dockerfile                 # Imagen Docker multi-stage
├── docker-compose.yml         # Orquestación Docker
├── CONFIGURACION_ENTORNO.md   # Variables de entorno documentadas
└── INSTALACION.md             # Esta guía
```

---

## Solución de Problemas

**La aplicación no inicia:**

```bash
pm2 logs nom035 --lines 50
# Verificar que DATABASE_URL y JWT_SECRET estén en .env
```

**Error de conexión a MySQL:**

```bash
mysql -u nom035_user -p nom035_db -h localhost
# Si falla, verificar permisos del usuario
```

**Puerto 3000 ocupado:**

```bash
sudo lsof -i :3000
# Cambiar PORT en .env si es necesario
```

**Nginx muestra 502 Bad Gateway:**

```bash
pm2 status  # Verificar que la app esté corriendo
sudo nginx -t  # Verificar configuración de Nginx
```

**Error en migraciones:**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## Jobs Automáticos

Los siguientes jobs se ejecutan automáticamente al iniciar el servidor:

| Job                        | Horario        | Descripción                                      |
| -------------------------- | -------------- | ------------------------------------------------ |
| `post-case-surveys-job`    | Diario 2:00 AM | Crea y envía encuestas post-caso (30/60/90 días) |
| `security-alerts-job`      | Cada hora      | Monitorea alertas de seguridad                   |
| `survey-alerts-job`        | Diario 8:00 AM | Verifica cobertura de encuestas NOM-035          |
| `compliance-reminders-job` | Semanal        | Recordatorios de cumplimiento normativo          |
| `executive-reports-job`    | Mensual        | Genera reportes ejecutivos automáticos           |

---

_Plataforma NOM-035 STPS 2018 — Todos los derechos reservados_
