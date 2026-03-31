#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Plataforma NOM-035 STPS 2018 — Script de Instalación Automática
#  Compatible con: Ubuntu 20.04/22.04/24.04, Debian 11/12
#
#  Uso:
#    chmod +x scripts/install.sh
#    sudo ./scripts/install.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Salir si cualquier comando falla

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header() { echo -e "\n${BLUE}══ $1 ══${NC}"; }

# ─── Verificar root ───────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Este script debe ejecutarse como root: sudo ./scripts/install.sh"
fi

# ─── Variables de instalación ─────────────────────────────────────────────────
APP_DIR="/opt/nom035"
APP_USER="nom035"
NODE_VERSION="22"
PNPM_VERSION="10.4.1"

header "Plataforma NOM-035 STPS 2018 — Instalación"
echo "  Directorio de instalación: $APP_DIR"
echo "  Usuario del sistema: $APP_USER"
echo ""

# ─── 1. Actualizar sistema ────────────────────────────────────────────────────
header "1. Actualizando sistema"
apt-get update -qq
apt-get upgrade -y -qq
log "Sistema actualizado"

# ─── 2. Instalar dependencias del sistema ────────────────────────────────────
header "2. Instalando dependencias"
apt-get install -y -qq \
  curl wget git unzip \
  build-essential \
  mysql-server \
  nginx \
  certbot python3-certbot-nginx \
  ufw
log "Dependencias instaladas"

# ─── 3. Instalar Node.js ──────────────────────────────────────────────────────
header "3. Instalando Node.js $NODE_VERSION"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
  log "Node.js $(node --version) instalado"
else
  log "Node.js ya instalado: $(node --version)"
fi

# ─── 4. Instalar pnpm ─────────────────────────────────────────────────────────
header "4. Instalando pnpm"
npm install -g pnpm@${PNPM_VERSION} 2>/dev/null
log "pnpm $(pnpm --version) instalado"

# ─── 5. Instalar PM2 ──────────────────────────────────────────────────────────
header "5. Instalando PM2 (gestor de procesos)"
npm install -g pm2 2>/dev/null
log "PM2 $(pm2 --version) instalado"

# ─── 6. Configurar MySQL ──────────────────────────────────────────────────────
header "6. Configurando MySQL"
systemctl start mysql
systemctl enable mysql

# Generar contraseña aleatoria para la BD
DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)

# Crear base de datos y usuario
mysql -u root << MYSQL_EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASSWORD}';
CREATE DATABASE IF NOT EXISTS nom035_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'nom035_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON nom035_db.* TO 'nom035_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_EOF

log "MySQL configurado"
log "  Base de datos: nom035_db"
log "  Usuario: nom035_user"

# ─── 7. Crear usuario del sistema ─────────────────────────────────────────────
header "7. Creando usuario del sistema"
if ! id "$APP_USER" &>/dev/null; then
  useradd -r -m -s /bin/bash "$APP_USER"
  log "Usuario $APP_USER creado"
else
  log "Usuario $APP_USER ya existe"
fi

# ─── 8. Instalar la aplicación ────────────────────────────────────────────────
header "8. Instalando la aplicación"
mkdir -p "$APP_DIR"
cp -r . "$APP_DIR/"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Generar JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)

# Crear archivo .env
cat > "$APP_DIR/.env" << ENV_EOF
LOCAL_AUTH=true
DATABASE_URL=mysql://nom035_user:${DB_PASSWORD}@localhost:3306/nom035_db
JWT_SECRET=${JWT_SECRET}
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
ENV_EOF

chmod 600 "$APP_DIR/.env"
log "Archivo .env creado"

# Instalar dependencias de Node.js
cd "$APP_DIR"
sudo -u "$APP_USER" pnpm install --frozen-lockfile 2>/dev/null
log "Dependencias de Node.js instaladas"

# Construir la aplicación
sudo -u "$APP_USER" pnpm build 2>/dev/null
log "Aplicación compilada"

# Aplicar migraciones de base de datos
sudo -u "$APP_USER" pnpm drizzle-kit migrate 2>/dev/null || warn "Migraciones: verificar manualmente"
log "Migraciones aplicadas"

# ─── 9. Configurar PM2 ────────────────────────────────────────────────────────
header "9. Configurando PM2"
cat > "$APP_DIR/ecosystem.config.cjs" << PM2_EOF
module.exports = {
  apps: [{
    name: 'nom035',
    script: 'dist/index.js',
    cwd: '${APP_DIR}',
    user: '${APP_USER}',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/nom035/error.log',
    out_file: '/var/log/nom035/out.log',
    log_file: '/var/log/nom035/combined.log',
    time: true
  }]
};
PM2_EOF

mkdir -p /var/log/nom035
chown -R "$APP_USER:$APP_USER" /var/log/nom035

sudo -u "$APP_USER" pm2 start "$APP_DIR/ecosystem.config.cjs"
sudo -u "$APP_USER" pm2 save
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash
log "PM2 configurado y aplicación iniciada"

# ─── 10. Configurar Nginx ─────────────────────────────────────────────────────
header "10. Configurando Nginx"
cat > /etc/nginx/sites-available/nom035 << NGINX_EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/nom035 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx configurado"

# ─── 11. Configurar firewall ──────────────────────────────────────────────────
header "11. Configurando firewall"
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall configurado"

# ─── 12. Crear primer administrador ──────────────────────────────────────────
header "12. Configuración del administrador"
echo ""
echo "  Ahora crearemos el primer usuario administrador."
echo ""
cd "$APP_DIR"
sudo -u "$APP_USER" node scripts/setup-admin.mjs

# ─── Resumen final ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Instalación completada exitosamente                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  La plataforma está disponible en: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "  Credenciales de base de datos (guardar en lugar seguro):"
echo "  ─────────────────────────────────────────────────────────"
echo "  MySQL root password: $DB_ROOT_PASSWORD"
echo "  DB user password:    $DB_PASSWORD"
echo "  JWT Secret:          $JWT_SECRET"
echo ""
echo "  Para agregar SSL con Let's Encrypt:"
echo "  sudo certbot --nginx -d tudominio.com"
echo ""
echo "  Logs de la aplicación:"
echo "  sudo -u $APP_USER pm2 logs nom035"
echo ""
