# Diagnóstico de Problemas de Login en Producción

## 🔍 Pasos para Diagnosticar

### 1. Verificar Variables de Entorno en Cloudflare Pages

1. Ve a tu proyecto en Cloudflare Pages Dashboard
2. Settings > Environment Variables
3. Verifica que estas variables estén configuradas para **Production**:
   - `ENCRYPTION_KEY`
   - `JWT_SECRET`
   - `D1_DATABASE_ID`
   - `R2_BUCKET_NAME`
   - `R2_ACCOUNT_ID`

### 2. Verificar Bindings de D1 y R2

1. Settings > Functions
2. Verifica que tengas:
   - **D1 Database binding**: Variable name `DB`, Database `coparenting-db-prod`
   - **R2 Bucket binding**: Variable name `BUCKET`, Bucket `coparenting-attachments`

### 3. Verificar Logs en Cloudflare

1. Ve a tu proyecto en Pages Dashboard
2. Click en **Deployments** > selecciona el último deployment
3. Click en **View build logs** o **View function logs**
4. Busca errores relacionados con:
   - `JWT_SECRET no está configurado`
   - `DB no está configurado`
   - `Usuario no encontrado`
   - `Password válido: false`

### 4. Verificar que los Usuarios Existan en la Base de Datos

Ejecuta este comando para verificar que los usuarios estén en la base de datos:

```bash
wrangler d1 execute coparenting-db-prod --remote --command "SELECT email, role FROM users LIMIT 10"
```

### 5. Probar Login desde la Consola del Navegador

Abre la consola del navegador (F12) en la página de login y ejecuta:

```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'maria.garcia@example.com',
    password: 'Password123'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 🐛 Errores Comunes y Soluciones

### Error: "Error de configuración del servidor"
**Causa**: Variables de entorno no configuradas o bindings incorrectos
**Solución**: Verifica pasos 1 y 2

### Error: "Credenciales inválidas" pero el usuario existe
**Causa**: Password hash incorrecto o seed no ejecutado
**Solución**: Ejecuta el seed en producción

### Error: "Usuario no encontrado"
**Causa**: El usuario no existe en la base de datos
**Solución**: Ejecuta el seed en producción
