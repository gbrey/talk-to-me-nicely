# Arquitectura Cloudflare Pages + Workers + D1

Este documento describe las decisiones de arquitectura tomadas para proyectos basados en Cloudflare Pages, Workers y D1 Database. Incluye lecciones aprendidas, errores comunes y soluciones. Útil como referencia para nuevos proyectos.

## Tabla de Contenidos

1. [Stack Tecnológico](#stack-tecnológico)
2. [Responsividad](#responsividad)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Configuración de Cloudflare](#configuración-de-cloudflare)
5. [Base de Datos D1](#base-de-datos-d1)
6. [Bindings: D1, R2, AI](#bindings-d1-r2-ai)
7. [Errores Comunes y Soluciones](#errores-comunes-y-soluciones)
8. [Seguridad](#seguridad)
9. [SSO con Google y Apple](#sso-con-google-y-apple)
10. [Desarrollo Local vs Producción](#desarrollo-local-vs-producción)
11. [Deployment](#deployment)
12. [Migraciones de Base de Datos](#migraciones-de-base-de-datos)
13. [Versionado de Aplicación](#versionado-de-aplicación)
14. [Variables de Entorno y Secrets](#variables-de-entorno-y-secrets)
15. [API Routing](#api-routing)
16. [Workers AI](#workers-ai)
17. [Analytics y Monitoreo](#analytics-y-monitoreo)
18. [Mejores Prácticas](#mejores-prácticas)
19. [Troubleshooting Detallado](#troubleshooting-detallado)

---

## Stack Tecnológico

### Frontend
- **HTML/CSS/JavaScript vanilla** - Sin frameworks pesados
- **Alpine.js** - Para reactividad ligera (CDN)
- **Tailwind CSS** - Para estilos (CDN en desarrollo, compilar en producción)
- **Chart.js** - Para gráficos (CDN)

### Backend
- **Cloudflare Pages Functions** - Serverless functions en edge
- **TypeScript** - Tipado estático
- **Cloudflare D1** - Base de datos SQLite distribuida
- **Cloudflare Workers Runtime** - V8 isolates en edge
- **Cloudflare Workers AI** - Modelos de IA en edge (opcional)
- **Cloudflare R2** - Storage de objetos (opcional)

### Infraestructura
- **Cloudflare Pages** - Hosting estático + Functions
- **Cloudflare D1** - Base de datos SQLite
- **GitHub** - Control de versiones y trigger de deploys

---

## Responsividad

### Breakpoints de Tailwind CSS

Tailwind CSS usa breakpoints móvil-first:

| Breakpoint | Tamaño | Uso |
|------------|--------|-----|
| `sm:` | 640px | Tablets pequeñas |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktop pequeño |
| `xl:` | 1280px | Desktop grande |
| `2xl:` | 1536px | Desktop extra grande |

**Ejemplo de uso**:
```html
<!-- Grid que se adapta: 1 columna en móvil, 3 en desktop -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

### Viewport Meta Tag

**Siempre incluir** en `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## Estructura del Proyecto

```
proyecto/
├── public/                    # Archivos estáticos (deploy a Pages)
│   ├── index.html
│   ├── js/                    # JavaScript del frontend
│   └── css/                   # Estilos
├── functions/                 # Cloudflare Pages Functions
│   └── api/
│       └── [[path]].ts        # Catch-all route para API
├── src/                       # Código TypeScript compartido
│   ├── api/                   # Handlers de API
│   └── utils/                 # Utilidades (db, encryption, etc)
├── migrations/                # Migraciones SQL de D1
│   ├── 0001_init.sql
│   └── ...
├── wrangler.toml              # Configuración de Wrangler
├── .dev.vars                  # Variables locales (NO commitear)
├── package.json
└── tsconfig.json
```

### Decisiones Clave

1. **`public/` es el output directory** - Todo lo que está aquí se deploya como estático
2. **`functions/` contiene Pages Functions** - Se ejecutan en edge como serverless
3. **`src/` contiene código compartido** - Importado por Functions pero no deployado directamente
4. **Migraciones numeradas** - `0001_`, `0002_`, etc. para orden de ejecución

---

## Configuración de Cloudflare

### wrangler.toml

```toml
name = "nombre-proyecto"
compatibility_date = "2024-01-01"
pages_build_output_dir = "public"

# D1 Database (desarrollo local)
[[d1_databases]]
binding = "DB"
database_name = "nombre-db"
database_id = "ID_LOCAL"  # Para desarrollo local
preview_database_id = "local"  # Para previews usar "local"

# D1 Database (producción)
[env.production]
name = "nombre-proyecto"

[[env.production.d1_databases]]
binding = "DB"
database_name = "nombre-db-prod"
database_id = "ID_PRODUCCION"  # Obtener con: wrangler d1 create nombre-db-prod

# R2 buckets (desarrollo local)
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "nombre-bucket"
preview_bucket_name = "nombre-bucket-preview"

# R2 buckets (producción)
[[env.production.r2_buckets]]
binding = "BUCKET"
bucket_name = "nombre-bucket"

# Cloudflare Workers AI binding (desarrollo local)
[ai]
binding = "AI"

# Cloudflare Workers AI binding (producción)
[env.production.ai]
binding = "AI"
```

### Importante

- **`wrangler.toml` SÍ debe commitearse** - Contiene configuración de bindings
- **NO commitear secrets** - Usar `.dev.vars` para desarrollo y Cloudflare Secrets para producción
- **Agregar `.dev.vars` a `.gitignore`** - Contiene secrets locales

---

## Base de Datos D1

### Crear Base de Datos

```bash
# Desarrollo local (se crea automáticamente)
npx wrangler pages dev public --d1 DB

# Producción
npx wrangler d1 create nombre-db-prod
```

Esto devuelve un `database_id` que se agrega a `wrangler.toml`.

### Características

- **SQLite distribuido** - Misma sintaxis SQL que SQLite
- **Consistencia eventual** - Replicación global con latencia baja
- **Sin conexiones** - Se accede vía binding `env.DB`
- **Migraciones versionadas** - Sistema de versionado automático

### Acceso desde Código

```typescript
// En cualquier Pages Function
export async function onRequest(context: any) {
  const { env } = context;
  
  // Acceder a D1
  const result = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first();
  
  return new Response(JSON.stringify(result));
}
```

### Tipos TypeScript

```typescript
// functions/api/[[path]].ts o src/utils/db.ts
import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;
  AI?: any; // Cloudflare Workers AI binding
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  // ... otros bindings
}
```

---

## Bindings: D1, R2, AI

### ¿Qué son los Bindings?

Los bindings son conexiones entre tu aplicación y servicios de Cloudflare. **Deben configurarse en DOS lugares**:

1. **`wrangler.toml`** - Para desarrollo local y configuración
2. **Cloudflare Pages Dashboard** - Para producción (Settings > Functions)

### Binding de D1 Database

**Problema común**: "DB binding not available" o "Database not found"

**Configuración en wrangler.toml**:
```toml
[[d1_databases]]
binding = "DB"
database_name = "nombre-db"
database_id = "ID_LOCAL"

[[env.production.d1_databases]]
binding = "DB"
database_name = "nombre-db-prod"
database_id = "ID_PRODUCCION"
```

**Configuración en Cloudflare Dashboard**:
1. Pages → Settings → Functions
2. D1 Database bindings → Add binding
3. Variable name: `DB` (exactamente "DB" en mayúsculas)
4. D1 Database: Seleccionar `nombre-db-prod` del dropdown
5. Save

**Verificar que funciona**:
```typescript
// En código, verificar que DB está disponible
if (!env.DB) {
  console.error('DB binding not available');
  return new Response('Database not configured', { status: 500 });
}
```

**Errores comunes**:
- ❌ Variable name diferente a `DB` → No funciona
- ❌ Database no existe → Crear primero con `wrangler d1 create`
- ❌ Binding no configurado en Dashboard → Configurar manualmente

### Binding de R2 Bucket

**Problema común**: "BUCKET binding not available"

**Configuración en wrangler.toml**:
```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "nombre-bucket"

[[env.production.r2_buckets]]
binding = "BUCKET"
bucket_name = "nombre-bucket"
```

**Configuración en Cloudflare Dashboard**:
1. Pages → Settings → Functions
2. R2 Bucket bindings → Add binding
3. Variable name: `BUCKET` (exactamente "BUCKET" en mayúsculas)
4. R2 Bucket: Seleccionar bucket del dropdown
5. Save

**Crear bucket primero**:
```bash
npx wrangler r2 bucket create nombre-bucket
```

**Verificar que funciona**:
```typescript
if (!env.BUCKET) {
  console.warn('BUCKET binding not available');
}
```

### Binding de Workers AI

**Problema común**: "AI binding not available" - Funciona en local pero no en producción

**Configuración en wrangler.toml**:
```toml
# Desarrollo local
[ai]
binding = "AI"

# Producción
[env.production.ai]
binding = "AI"
```

**Configuración en Cloudflare Dashboard**:
1. Pages → Settings → Functions
2. AI bindings → Add binding
3. Variable name: `AI` (exactamente "AI" en mayúsculas)
4. Workers AI: Se configura automáticamente
5. Save

**IMPORTANTE**: Si el Dashboard dice "Bindings for this project are being managed through wrangler.toml", entonces el binding debe estar en `wrangler.toml` con la sección `[env.production.ai]`.

**Verificar que funciona**:
```typescript
if (env.AI) {
  console.log('AI binding available, using Cloudflare Workers AI');
  // Usar AI
} else {
  console.warn('AI binding NOT available - using fallback');
  // Usar análisis básico
}
```

**Script de desarrollo**:
```json
// package.json
{
  "scripts": {
    "dev": "wrangler pages dev public --d1 DB --r2 BUCKET --ai"
  }
}
```

**Errores comunes**:
- ❌ Binding no configurado en `wrangler.toml` → Agregar `[env.production.ai]`
- ❌ Variable name diferente a `AI` → Debe ser exactamente "AI"
- ❌ Workers AI no habilitado en cuenta → Habilitar en Workers AI dashboard

---

## Errores Comunes y Soluciones

### Error: "DB binding not available" o "Database not found"

**Síntomas**:
- La app funciona en local pero falla en producción
- Error 500 en todas las requests
- Logs muestran: "DB is missing" o "Database not found"

**Causas posibles**:
1. Binding no configurado en Cloudflare Dashboard
2. Variable name incorrecta (debe ser exactamente `DB`)
3. Database no existe o ID incorrecto

**Solución paso a paso**:

1. **Verificar que la base de datos existe**:
```bash
npx wrangler d1 list
```

2. **Verificar binding en wrangler.toml**:
```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "nombre-db-prod"
database_id = "ID_CORRECTO"
```

3. **Configurar binding en Dashboard**:
   - Pages → Settings → Functions
   - D1 Database bindings → Add binding
   - Variable name: `DB`
   - D1 Database: Seleccionar del dropdown
   - Save

4. **Verificar en código**:
```typescript
// Agregar logging para debug
if (!env.DB) {
  console.error('DB binding not available');
  return new Response('Database not configured', { status: 500 });
}
```

5. **Redesplegar**: Hacer push a GitHub o redeploy manual

### Error: "JWT_SECRET is missing" o "ENCRYPTION_KEY is missing"

**Síntomas**:
- Error 500 en login/registro
- Logs muestran: "Server configuration error: JWT_SECRET missing"

**Causa**: Variables de entorno no configuradas en producción

**Solución**:

1. **Generar secrets**:
```bash
# Generar ENCRYPTION_KEY (32 bytes = 64 caracteres hex)
openssl rand -hex 32

# Generar JWT_SECRET (32 bytes = 64 caracteres hex)
openssl rand -hex 32
```

2. **Configurar en Cloudflare Dashboard**:
   - Pages → Settings → Environment Variables
   - Agregar variable:
     - Name: `ENCRYPTION_KEY`
     - Value: (el valor generado)
     - Environment: Production
   - Repetir para `JWT_SECRET`

3. **O usar wrangler CLI**:
```bash
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put JWT_SECRET
```

4. **Verificar en código**:
```typescript
if (!env.JWT_SECRET) {
  console.error('JWT_SECRET is missing!');
  return new Response('Server configuration error', { status: 500 });
}
```

### Error: "AI binding NOT available" en producción

**Síntomas**:
- Validación de IA funciona en local pero no en producción
- Logs muestran: "AI binding NOT available - using basic analysis"

**Causa**: Binding AI no configurado en producción

**Solución**:

1. **Verificar wrangler.toml**:
```toml
[env.production.ai]
binding = "AI"
```

2. **Si Dashboard dice "managed through wrangler.toml"**:
   - El binding debe estar en `wrangler.toml`
   - Hacer commit y push
   - Cloudflare leerá automáticamente

3. **Si Dashboard permite configurar manualmente**:
   - Pages → Settings → Functions
   - AI bindings → Add binding
   - Variable name: `AI`
   - Save

4. **Verificar en logs**:
```typescript
if (env.AI) {
  console.log('AI binding available');
} else {
  console.warn('AI binding NOT available');
}
```

### Error: "No routes found when building Functions directory"

**Síntomas**:
- Deploy falla con error de routing
- Functions no se detectan

**Causa**: Estructura de funciones incorrecta

**Solución**:

1. **Verificar estructura**:
```
functions/
└── api/
    └── [[path]].ts  # Catch-all route
```

2. **Verificar que el archivo exporta `onRequest`**:
```typescript
export async function onRequest(context: any): Promise<Response> {
  // ...
}
```

3. **Verificar tsconfig.json**:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Error: Base de datos local diferente a producción

**Síntomas**:
- Datos diferentes entre local y producción
- Migraciones no aplicadas

**Solución**:

1. **Aplicar migraciones en producción**:
```bash
npx wrangler d1 migrations apply nombre-db-prod --remote
```

2. **Verificar esquema**:
```bash
# Local
npx wrangler d1 execute nombre-db --local --command "PRAGMA table_info(users);"

# Producción
npx wrangler d1 execute nombre-db-prod --remote --command "PRAGMA table_info(users);"
```

3. **Sincronizar datos si es necesario**:
```bash
# Exportar de producción
npx wrangler d1 export nombre-db-prod --remote --output backup.sql

# Importar a local (si es necesario)
npx wrangler d1 execute nombre-db --local --file backup.sql
```

### Error: "Function timeout"

**Síntomas**:
- Requests que tardan mucho fallan
- Error 524 o timeout

**Solución**:

1. **Aumentar timeout en Dashboard**:
   - Pages → Settings → Functions
   - Limits → CPU time
   - Aumentar a máximo permitido (30 segundos)

2. **Optimizar queries**:
   - Usar índices apropiados
   - Limitar resultados con `LIMIT`
   - Evitar queries complejos en loops

3. **Usar streaming para respuestas grandes**:
```typescript
// En lugar de cargar todo en memoria
const stream = new ReadableStream({
  // ...
});
return new Response(stream);
```

---

## Seguridad

### 1. Encriptación de Datos Sensibles

**Problema**: Credenciales de APIs externas deben almacenarse encriptadas.

**Solución**: Usar Web Crypto API con AES-GCM.

```typescript
// src/utils/encryption.ts
export async function encrypt(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generar IV aleatorio
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Importar clave
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.slice(0, 32)), // AES-GCM requiere 32 bytes
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encriptar
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combinar IV + datos encriptados y convertir a base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext: string, key: string): Promise<string> {
  // Proceso inverso
  // ...
}
```

**Uso**:
- Encriptar antes de guardar: `encrypt(apiKey, env.ENCRYPTION_KEY)`
- Desencriptar al leer: `decrypt(encrypted, env.ENCRYPTION_KEY)`

### 2. Autenticación JWT

**Problema**: Necesitamos autenticación stateless para API.

**Solución**: JWT tokens firmados con secret.

```typescript
// src/utils/jwt.ts
import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export async function generateToken(env: Env, userId: string, email: string): Promise<string> {
  return await sign(
    { userId, email, iat: Math.floor(Date.now() / 1000) },
    env.JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

export async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    return await verify(token, secret, { algorithm: 'HS256' });
  } catch {
    return null;
  }
}
```

**Flujo**:
1. Usuario hace login → Backend genera JWT
2. Frontend guarda token en cookie httpOnly
3. Cada request incluye cookie automáticamente
4. Backend verifica token antes de procesar

### 3. Hash de Passwords

**Problema**: Passwords no deben almacenarse en texto plano.

**Solución**: SHA-256 (en producción considerar bcrypt o Argon2 si es posible).

```typescript
async function hashPassword(password: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltValue = salt || crypto.getRandomValues(new Uint8Array(16));
  const data = encoder.encode(password + saltValue);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Nota**: SHA-256 es suficiente para Workers (sin bcrypt disponible), pero en producción considerar algoritmos más robustos si es posible.

### 4. Secrets Management

**NUNCA** commitear secrets en código:
- ✅ Usar `wrangler secret put` para producción
- ✅ Usar `.dev.vars` para desarrollo local (en `.gitignore`)
- ✅ Variables de entorno en Cloudflare Dashboard

**Generar secrets seguros**:
```bash
# Encryption Key (32 bytes = 64 caracteres hex)
openssl rand -hex 32

# JWT Secret (32 bytes = 64 caracteres hex)
openssl rand -hex 32
```

---

## SSO con Google y Apple

### Enfoque Híbrido

Permitir tanto SSO (Google/Apple) como login tradicional (email/password). El usuario puede:
- Crear cuenta nueva con SSO
- Crear cuenta nueva con email/password
- Vincular SSO a cuenta existente
- Usar cualquiera de los métodos para login

### Configuración de OAuth Apps

#### Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto o seleccionar existente
3. Habilitar "Google+ API" o "Google Identity"
4. Crear credenciales OAuth 2.0:
   - Tipo: "Web application"
   - Authorized redirect URIs: `https://tu-dominio.pages.dev/api/auth/oauth/callback`
5. Guardar `CLIENT_ID` y `CLIENT_SECRET` como secrets

#### Apple Developer

1. Ir a [Apple Developer Portal](https://developer.apple.com/)
2. Crear App ID con "Sign in with Apple" capability
3. Crear Service ID:
   - Domain: `tu-dominio.pages.dev`
   - Return URLs: `https://tu-dominio.pages.dev/api/auth/oauth/callback`
4. Crear Key para "Sign in with Apple"
5. Guardar `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, y `APPLE_PRIVATE_KEY` como secrets

### Secrets Requeridos

```bash
# Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

# Apple OAuth
npx wrangler secret put APPLE_CLIENT_ID
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_KEY_ID
npx wrangler secret put APPLE_PRIVATE_KEY
```

---

## Desarrollo Local vs Producción

### Desarrollo Local

**Comando**:
```bash
npm run dev
# Equivale a:
npx wrangler pages dev public --d1 DB --r2 BUCKET --ai
```

**Características**:
- Servidor local en `http://localhost:8788`
- Usa `.dev.vars` para variables de entorno
- Usa base de datos SQLite local (`.wrangler/state/v3/d1/`)
- Hot reload automático

**Configuración Local**:
```bash
# .dev.vars (NO commitear)
ENCRYPTION_KEY=clave-local-minimo-32-caracteres
JWT_SECRET=secret-local-minimo-32-caracteres
```

**Base de Datos Local**:
```bash
# Aplicar migraciones localmente
npx wrangler d1 migrations apply nombre-db --local

# Ejecutar SQL directamente
npx wrangler d1 execute nombre-db --local --command "SELECT * FROM users"
```

### Producción

**Deployment**:
- Automático vía GitHub hook (recomendado)
- Manual con `npm run deploy`

**Configuración**:
- Secrets configurados en Cloudflare Dashboard o con `wrangler secret put`
- Base de datos D1 en producción (no local)
- Variables de entorno en Settings → Environment Variables
- **Bindings configurados en Dashboard** (Settings → Functions)

**Diferencias Clave**:

| Aspecto | Local | Producción |
|---------|-------|------------|
| Base de Datos | SQLite local | D1 distribuido |
| Variables | `.dev.vars` | Cloudflare Secrets |
| Bindings | `wrangler.toml` | Dashboard + `wrangler.toml` |
| URL | `localhost:8788` | `proyecto.pages.dev` |
| Logs | Terminal | Cloudflare Dashboard |

---

## Deployment

### Opción 1: GitHub Hook (Recomendado)

**Configuración**:
1. Cloudflare Dashboard → Pages → Create Project
2. Conectar repositorio de GitHub
3. Configurar:
   - **Build command**: `npm ci` (o vacío si no hay build)
   - **Build output directory**: `public`
   - **Root directory**: `/` (raíz del repo)

**Flujo**:
- Push a `main` → Cloudflare detecta → Deploy automático
- No necesita GitHub Actions (evitar duplicación)

**Ventajas**:
- Deploy automático en cada push
- Preview deployments en PRs
- Rollback fácil desde dashboard

### Opción 2: Manual

```bash
# Deploy a producción
npm run deploy
# Equivale a:
npx wrangler pages deploy public
```

### Configuración Post-Deployment

**IMPORTANTE**: Después del primer deploy, configurar:

1. **Bindings en Dashboard**:
   - D1 Database binding
   - R2 Bucket binding (si se usa)
   - AI binding (si se usa)

2. **Secrets**:
   - `ENCRYPTION_KEY`
   - `JWT_SECRET`
   - OAuth secrets (si se usa SSO)

3. **Variables de entorno**:
   - Variables no sensibles en Settings → Environment Variables

4. **Aplicar migraciones**:
```bash
npx wrangler d1 migrations apply nombre-db-prod --remote
```

---

## Migraciones de Base de Datos

### Estructura

```
migrations/
├── 0001_init.sql
├── 0002_add_feature.sql
└── 0003_fix_bug.sql
```

**Convención**:
- Numerar con `0001_`, `0002_`, etc.
- Nombres descriptivos: `add_feature`, `fix_bug`, etc.
- SQL puro, sin lógica de aplicación

### Aplicar Migraciones

**Local**:
```bash
npx wrangler d1 migrations apply nombre-db --local
```

**Producción**:
```bash
npx wrangler d1 migrations apply nombre-db-prod --remote
```

**Ambos**:
```bash
npm run migrate
# (configurar script en package.json)
```

### Ejemplo de Migración

```sql
-- migrations/0002_add_feature.sql
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
```

### Mejores Prácticas

1. **Siempre usar `IF NOT EXISTS`** - Evita errores en re-ejecución
2. **Usar transacciones implícitas** - D1 maneja transacciones automáticamente
3. **Probar localmente primero** - Aplicar migraciones localmente antes de producción
4. **Backup antes de migraciones grandes** - Usar `wrangler d1 export`

---

## Versionado de Aplicación

### Semantic Versioning (SemVer)

Usar formato `MAJOR.MINOR.PATCH`:
- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás
- **PATCH**: Correcciones de bugs compatibles

**Ejemplo**: `1.2.3`
- `1` = Major (cambios breaking)
- `2` = Minor (nuevas features)
- `3` = Patch (bug fixes)

### Versionado en package.json

```json
{
  "name": "mi-proyecto",
  "version": "1.0.0",
  "description": "Descripción del proyecto"
}
```

**Actualizar versión**:

```bash
# Manualmente: editar package.json
# O usar npm version:
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

---

## Variables de Entorno y Secrets

### Secrets (Sensibles)

**Producción**:
```bash
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put JWT_SECRET
```

**Local**:
```bash
# .dev.vars
ENCRYPTION_KEY=clave-local-32-chars-min
JWT_SECRET=secret-local-32-chars-min
```

### Variables de Entorno (No Sensibles)

**Producción**: Cloudflare Dashboard → Pages → Settings → Environment Variables

**Local**: `.dev.vars` (mismo formato)

### Tipos de Variables

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| Secret | Credenciales, keys | `ENCRYPTION_KEY`, `JWT_SECRET` |
| Environment Variable | Configuración | `API_URL`, `FEATURE_FLAG` |

### Acceso desde Código

```typescript
export async function onRequest(context: any) {
  const { env } = context;
  
  // Secrets y variables están en env
  const key = env.ENCRYPTION_KEY;
  const apiUrl = env.API_URL;
}
```

---

## API Routing

### Estructura

**Catch-all route**: `functions/api/[[path]].ts`

```typescript
export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Routing manual
  if (path === '/api/auth/login' && request.method === 'POST') {
    return handleLogin(request, env);
  }
  
  if (path.startsWith('/api/users')) {
    return handleUsers(request, env);
  }
  
  return new Response('Not Found', { status: 404 });
}
```

### CORS Headers

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Handle preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Agregar a todas las respuestas
return new Response(body, {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

---

## Workers AI

### Configuración

**wrangler.toml**:
```toml
[ai]
binding = "AI"

[env.production.ai]
binding = "AI"
```

**package.json**:
```json
{
  "scripts": {
    "dev": "wrangler pages dev public --d1 DB --r2 BUCKET --ai"
  }
}
```

**Dashboard** (si es necesario):
- Pages → Settings → Functions → AI bindings
- Variable name: `AI`
- Workers AI: Se configura automáticamente

### Uso

```typescript
if (env.AI) {
  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ]
  });
  
  console.log(response.response);
} else {
  console.warn('AI binding not available');
}
```

### Modelos Disponibles

- `@cf/meta/llama-3-8b-instruct` - Balance velocidad/calidad
- `@cf/meta/llama-3-70b-instruct` - Mejor calidad, más lento
- Ver catálogo completo en [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)

---

## Analytics y Monitoreo

### Cloudflare Web Analytics

**Configuración**:
1. Cloudflare Dashboard → Analytics → Web Analytics
2. Add a site
3. Copiar token del script tag
4. Agregar a páginas HTML:

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "TU_TOKEN"}'></script>
```

**Métricas disponibles**:
- Pageviews
- Visits
- Bandwidth
- Core Web Vitals
- Top Pages
- Referrers

### Logs de Workers

**Ver logs en producción**:
- Cloudflare Dashboard → Pages → Logs
- O con CLI: `npx wrangler pages deployment tail`

**Logging en código**:
```typescript
console.log('[DEBUG]', 'Operation started');
console.info('[INFO]', 'User action completed');
console.warn('[WARN]', 'Deprecated API used');
console.error('[ERROR]', 'Operation failed', error);
```

### Analytics Interno

Crear endpoints de analytics usando datos de `audit_log`:

```typescript
// src/api/analytics.ts
export async function getStats(ctx: Context): Promise<Response> {
  const stats = await ctx.env.DB.prepare(
    'SELECT COUNT(*) as total FROM messages WHERE created_at >= ?'
  ).bind(last30d).first();
  
  return new Response(JSON.stringify({ stats }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## Mejores Prácticas

### 1. Estructura de Código

- **Separar concerns**: `src/api/` para handlers, `src/utils/` para utilidades
- **Tipos compartidos**: Definir interfaces en `src/utils/db.ts`
- **No duplicar lógica**: Reutilizar funciones entre endpoints

### 2. Manejo de Errores

```typescript
try {
  // Lógica
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error: any) {
  console.error('[ERROR] Operation failed:', error);
  return new Response(JSON.stringify({ 
    error: 'Error interno del servidor',
    message: error.message 
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 3. Logging

```typescript
// Debug logging (útil en desarrollo)
console.log('[DEBUG] Operation:', { userId, accountId });

// Error logging (siempre)
console.error('[ERROR] Failed:', error.message, error.stack);
```

**Ver logs**:
- Local: Terminal donde corre `wrangler pages dev`
- Producción: Cloudflare Dashboard → Pages → Logs

### 4. Testing Local

```bash
# Servidor con logs detallados
npm run dev

# Verificar base de datos local
npx wrangler d1 execute nombre-db --local --command "SELECT * FROM users"
```

### 5. Gitignore

**Siempre ignorar**:
```
.env
.env.local
.dev.vars
*.pem
*.key
*.crt
.wrangler/
node_modules/
```

**NO ignorar**:
- `wrangler.toml` (contiene configuración de bindings)
- `package.json`
- `tsconfig.json`

### 6. TypeScript

**Configuración recomendada** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true
  }
}
```

### 7. Dependencias

**Minimizar dependencias**:
- Workers tiene límites de tamaño
- Preferir APIs nativas cuando sea posible
- Usar CDN para librerías del frontend

**Dependencias comunes**:
- `@cloudflare/workers-types` - Tipos TypeScript
- `@tsndr/cloudflare-worker-jwt` - JWT (si se necesita)
- `wrangler` - CLI (devDependency)

---

## Troubleshooting Detallado

### Checklist de Diagnóstico

Cuando algo no funciona, seguir este orden:

1. **Verificar bindings en Dashboard**:
   - Pages → Settings → Functions
   - Verificar D1, R2, AI bindings están configurados

2. **Verificar secrets**:
   - Pages → Settings → Environment Variables
   - O con CLI: `npx wrangler secret list`

3. **Verificar logs**:
   - Pages → Logs
   - Buscar errores específicos

4. **Verificar base de datos**:
   ```bash
   npx wrangler d1 execute nombre-db-prod --remote --command "SELECT 1"
   ```

5. **Verificar deployment**:
   - Pages → Deployments
   - Verificar que el último deployment fue exitoso

### Errores Específicos

#### "DB binding not available"

**Diagnóstico**:
```typescript
// Agregar en código
if (!env.DB) {
  console.error('DB binding not available');
  return new Response('Database not configured', { status: 500 });
}
```

**Solución**:
1. Verificar `wrangler.toml` tiene `[[env.production.d1_databases]]`
2. Configurar binding en Dashboard
3. Redesplegar

#### "AI binding NOT available"

**Diagnóstico**:
```typescript
if (env.AI) {
  console.log('AI binding available');
} else {
  console.warn('AI binding NOT available');
}
```

**Solución**:
1. Verificar `wrangler.toml` tiene `[env.production.ai]`
2. Si Dashboard dice "managed through wrangler.toml", hacer commit y push
3. Si Dashboard permite configurar, agregar binding manualmente

#### "JWT_SECRET is missing"

**Solución**:
```bash
npx wrangler secret put JWT_SECRET
# O configurar en Dashboard → Environment Variables
```

#### "Function timeout"

**Solución**:
1. Pages → Settings → Functions → Limits
2. Aumentar CPU time
3. Optimizar queries (usar índices, LIMIT)

### Debugging en Producción

**Agregar logging detallado**:
```typescript
console.log('[DEBUG]', {
  operation: 'user_login',
  userId: user.id,
  timestamp: new Date().toISOString(),
  env: {
    hasDB: !!env.DB,
    hasAI: !!env.AI,
    hasBucket: !!env.BUCKET
  }
});
```

**Ver logs en tiempo real**:
```bash
npx wrangler pages deployment tail --format=pretty
```

---

## Checklist de Setup Inicial

Para un nuevo proyecto:

- [ ] Crear repositorio GitHub
- [ ] Crear proyecto en Cloudflare Pages
- [ ] Conectar GitHub a Cloudflare Pages
- [ ] Crear base de datos D1: `npx wrangler d1 create nombre-db-prod`
- [ ] Configurar `wrangler.toml` con database_id
- [ ] Crear `.dev.vars` para desarrollo local
- [ ] Configurar secrets en producción: `wrangler secret put`
- [ ] Crear primera migración: `migrations/0001_init.sql`
- [ ] Aplicar migraciones: `npm run migrate`
- [ ] **Configurar bindings en Cloudflare Dashboard**:
  - [ ] D1 Database binding
  - [ ] R2 Bucket binding (si se usa)
  - [ ] AI binding (si se usa)
- [ ] Crear `functions/api/[[path]].ts` para routing
- [ ] Probar localmente: `npm run dev`
- [ ] Hacer primer deploy: push a `main`
- [ ] Verificar logs después del deploy
- [ ] Probar funcionalidad en producción

---

## Recursos

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

**Última actualización**: Enero 2025

**Lecciones aprendidas**:
- Bindings deben configurarse en Dashboard además de wrangler.toml
- Verificar siempre que bindings estén disponibles antes de usarlos
- Logging detallado es esencial para debugging en producción
- Probar localmente primero, luego verificar en producción
- Secrets y variables de entorno son diferentes (secrets no se ven en Dashboard)
