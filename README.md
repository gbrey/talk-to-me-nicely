# Talk to me nicely - Co-Parenting App

Aplicación web de co-parenting para situaciones de alto conflicto en Argentina.

## Stack Tecnológico

- **Frontend**: HTML/CSS/JavaScript vanilla + Alpine.js (CDN) + Tailwind CSS (CDN)
- **Backend**: Cloudflare Pages Functions (TypeScript)
- **Base de datos**: Cloudflare D1 (SQLite distribuido)
- **Storage**: Cloudflare R2 para adjuntos
- **IA**: Cloudflare Workers AI para análisis de tono
- **Auth**: JWT + SSO (Google/Apple)

## Estructura del Proyecto

```
t2mn/
├── public/                    # Frontend estático
│   ├── index.html             # Dashboard principal
│   ├── login.html             # Login/registro
│   ├── messages.html          # Mensajería por temas
│   ├── calendar.html          # Calendario compartido
│   ├── child-view.html        # Vista modo niño
│   ├── professional.html      # Vista profesional
│   ├── js/                    # JavaScript frontend
│   └── css/                   # Estilos adicionales
├── functions/                 # Cloudflare Pages Functions
│   └── api/
│       └── [[path]].ts        # Catch-all router
├── src/                       # Código TypeScript compartido
│   ├── api/                   # Handlers de API
│   └── utils/                  # Utilidades
├── migrations/                # Migraciones SQL
└── wrangler.toml              # Config Cloudflare
```

## Setup Local

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .dev.vars.example .dev.vars
# Editar .dev.vars con tus valores
```

3. Crear base de datos D1:
```bash
wrangler d1 create coparenting-db
# Copiar el database_id a wrangler.toml
```

4. Ejecutar migraciones:
```bash
wrangler d1 migrations apply DB
```

5. Iniciar servidor de desarrollo:
```bash
npm run dev
```

## Variables de Entorno

Ver `.dev.vars.example` para la lista completa de variables requeridas:

- `ENCRYPTION_KEY`: Clave de 32+ caracteres para AES-GCM
- `JWT_SECRET`: Secret de 32+ caracteres para JWT
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth Google
- `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY`: OAuth Apple
- `D1_DATABASE_ID`: ID de la base D1
- `R2_BUCKET_NAME`: Nombre del bucket R2
- `R2_ACCOUNT_ID`: Account ID de Cloudflare

## Deployment

1. Configurar Cloudflare Pages:
```bash
npm run deploy
```

2. Configurar variables de entorno en Cloudflare Dashboard

3. Ejecutar migraciones en producción:
```bash
wrangler d1 migrations apply DB --env production
```

## Funcionalidades

### Sistema de Identidad y Roles
- Registro con email/password o SSO
- Roles: parent, child, professional
- Sistema de consentimientos (Ley 25.326)

### Mensajería Estructurada
- 5 canales predefinidos (daily, health, school, calendar, vacation)
- Mensajes inmutables post-envío
- Timestamps verificables
- IA Coach de tono (ToneMeter)

### Calendario
- Eventos compartidos
- Solicitudes de cambio con aprobación
- Indicadores de "con quién está el niño"

### Modo Niño
- Vista limitada y simplificada
- Solo calendario y mensajes compartidos
- Autenticación con PIN

### Acceso Profesional
- View-only de mensajes y calendario
- Generación de reportes
- Requiere aprobación de ambos padres

## Seguridad

- Passwords hasheados con SHA-256 + salt
- JWT en cookies httpOnly
- Rate limiting por endpoint
- Validación y sanitización de inputs
- Audit log completo
- Encriptación AES-GCM para datos sensibles

## Licencia

MIT

