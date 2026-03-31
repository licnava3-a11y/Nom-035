# Configuración de Variables de Entorno

> **Instrucciones:** Crea un archivo llamado `.env` en la raíz del proyecto y copia el contenido de abajo, ajustando los valores según tu entorno.

```bash
# ─── Modo de autenticación ────────────────────────────────────────────────────
# true  = Autenticación local (usuario/contraseña). Recomendado para servidores propios.
# false = Manus OAuth (solo para plataforma Manus.im)
LOCAL_AUTH=true

# ─── Base de datos ────────────────────────────────────────────────────────────
# Formato: mysql://usuario:contraseña@host:puerto/nombre_bd
DATABASE_URL=mysql://nom035_user:CHANGE_PASSWORD@localhost:3306/nom035_db

# Para Docker Compose, usar el nombre del servicio como host:
# DATABASE_URL=mysql://nom035_user:CHANGE_PASSWORD@db:3306/nom035_db

# ─── Seguridad ────────────────────────────────────────────────────────────────
# Clave secreta para firmar tokens JWT de sesión (mínimo 32 caracteres)
# Generar con: openssl rand -hex 32
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS

# ─── Servidor ─────────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=production

# ─── Información de la aplicación ────────────────────────────────────────────
VITE_APP_TITLE=Plataforma NOM-035 STPS 2018
OWNER_NAME=Administrador del Sistema

# ─── Variables requeridas por el framework (dejar vacías en modo local) ───────
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

# ─── SMTP (envío de correos) ──────────────────────────────────────────────────
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_USER=noreply@tudominio.com
SMTP_PASS=tu_contraseña_smtp
SMTP_FROM=noreply@tudominio.com

# ─── MySQL (para Docker Compose) ─────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=rootpassword_CHANGE_ME
MYSQL_DATABASE=nom035_db
MYSQL_USER=nom035_user
MYSQL_PASSWORD=nom035_password_CHANGE_ME

# ─── Docker / Nginx ───────────────────────────────────────────────────────────
APP_PORT=3000
```

## Generar JWT_SECRET seguro

```bash
openssl rand -hex 32
```
