# Guía de Setup en Cloudflare

Esta guía te ayudará a configurar toda la infraestructura en Cloudflare para desplegar la aplicación.

## 📋 Prerequisitos

1. Cuenta de Cloudflare (gratuita)
2. GitHub repository conectado
3. Wrangler CLI instalado (`npm install -g wrangler`)

## 🚀 Pasos de Configuración

### 1. Autenticación con Cloudflare

```bash
wrangler login
```

### 2. Crear Base de Datos D1 (Producción)

```bash
# Crear base de datos de producción
wrangler d1 create coparenting-db-prod

# Anotar el database_id que se genera
# Actualizar wrangler.toml con el ID de producción
```

### 3. Aplicar Migraciones en Producción

```bash
# Aplicar todas las migraciones
wrangler d1 migrations apply coparenting-db-prod --remote
```

### 4. Crear Bucket R2 para Adjuntos

```bash
# Crear bucket
wrangler r2 bucket create coparenting-attachments

# O desde el dashboard de Cloudflare:
# R2 > Create bucket > coparenting-attachments
```

### 5. Configurar Cloudflare Pages

#### Opción A: Desde el Dashboard

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona **Pages** en el menú lateral
3. Click en **Create a project**
4. Conecta tu repositorio de GitHub: `gbrey/talk-to-me-nicely`
5. Configuración:
   - **Project name**: `talk-to-me-nicely`
   - **Production branch**: `main`
   - **Build command**: (dejar vacío, no hay build)
   - **Build output directory**: `public`
   - **Root directory**: `/` (raíz del repo)

#### Opción B: Desde Wrangler CLI

```bash
wrangler pages project create talk-to-me-nicely
```

### 6. Configurar Variables de Entorno

En Cloudflare Pages Dashboard:

1. Ve a tu proyecto `talk-to-me-nicely`
2. Settings > Environment Variables
3. Agrega las siguientes variables:

**Production:**
```
ENCRYPTION_KEY=<generar-clave-32-caracteres>
JWT_SECRET=<generar-secret-32-caracteres>
D1_DATABASE_ID=<id-de-la-base-datos>
R2_BUCKET_NAME=coparenting-attachments
R2_ACCOUNT_ID=<tu-account-id>
```

**Preview (opcional):**
```
ENCRYPTION_KEY=<otra-clave-para-preview>
JWT_SECRET=<otro-secret-para-preview>
D1_DATABASE_ID=<id-de-base-preview>
R2_BUCKET_NAME=coparenting-attachments-preview
R2_ACCOUNT_ID=<tu-account-id>
```

### 7. Configurar Bindings de D1 y R2

En Cloudflare Pages Dashboard:

1. Settings > Functions
2. D1 Database bindings:
   - Variable name: `DB`
   - D1 Database: `coparenting-db-prod`

3. R2 Bucket bindings:
   - Variable name: `BUCKET`
   - R2 Bucket: `coparenting-attachments`

### 8. Configurar Workers AI (Opcional)

Si quieres usar Cloudflare Workers AI para el análisis de tono:

1. Ve a Workers AI en el dashboard
2. Habilita Workers AI para tu cuenta
3. En Pages > Settings > Functions, agrega el binding:
   - Variable name: `AI`
   - Workers AI: (se configura automáticamente)

### 9. Configurar Dominio Personalizado (Opcional)

1. En Pages > Custom domains
2. Agrega tu dominio
3. Sigue las instrucciones para configurar DNS

### 10. Configurar OAuth (Opcional)

Si quieres habilitar OAuth con Google/Apple:

1. Crea aplicaciones OAuth en Google/Apple
2. Agrega las variables de entorno correspondientes:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `APPLE_CLIENT_ID`
   - `APPLE_TEAM_ID`
   - `APPLE_KEY_ID`
   - `APPLE_PRIVATE_KEY`

## 🔐 Generar Secrets Seguros

Para generar claves seguras:

```bash
# Encryption Key (32+ caracteres)
openssl rand -hex 32

# JWT Secret (32+ caracteres)
openssl rand -hex 32
```

## 📝 Verificar Deployment

1. Después del primer push a `main`, Cloudflare Pages debería desplegar automáticamente
2. Ve a tu proyecto en Pages dashboard
3. Click en el deployment para ver la URL
4. La URL será: `https://talk-to-me-nicely.pages.dev`

## 🧪 Testing en Producción

1. Ejecuta el seed en producción (solo una vez):
```bash
# Desde tu máquina local, conectado a la base de producción
curl -X POST https://talk-to-me-nicely.pages.dev/api/seed
```

2. Prueba login con las credenciales de demo

## 🔄 CI/CD con GitHub Actions

El archivo `.github/workflows/deploy.yml` está configurado para deployment automático.

Necesitas agregar estos secrets en GitHub:

1. Ve a tu repo en GitHub
2. Settings > Secrets and variables > Actions
3. Agrega:
   - `CLOUDFLARE_API_TOKEN`: Tu API token de Cloudflare
   - `CLOUDFLARE_ACCOUNT_ID`: Tu Account ID

Para obtener el API Token:
1. Cloudflare Dashboard > My Profile > API Tokens
2. Create Token > Edit Cloudflare Workers (template)
3. Permissions: Account > Cloudflare Pages > Edit
4. Copy el token

## 📊 Monitoreo

- **Analytics**: Cloudflare Pages incluye analytics básicos
- **Logs**: Ve a Pages > Deployments > [deployment] > Logs
- **Errors**: Se muestran en el dashboard de Pages

## 🛠️ Troubleshooting

### Error: Database not found
- Verifica que el binding `DB` esté configurado correctamente
- Verifica que el `D1_DATABASE_ID` en variables de entorno sea correcto

### Error: R2 bucket not found
- Verifica que el bucket exista
- Verifica el binding `BUCKET` en Functions

### Error: Function timeout
- Aumenta el timeout en Pages > Settings > Functions
- Optimiza queries a la base de datos

## 📚 Recursos

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
