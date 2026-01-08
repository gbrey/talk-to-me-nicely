# Debug: Problemas de Login en Producción

## 🔍 Pasos para Diagnosticar

### 1. Verificar Variables de Entorno en Cloudflare Pages

1. Ve a tu proyecto en Cloudflare Pages Dashboard
2. Settings > Environment Variables
3. Verifica que estas variables estén configuradas para **Production**:
   - `ENCRYPTION_KEY` - Debe tener 64 caracteres (32 bytes en hex)
   - `JWT_SECRET` - Debe tener 64 caracteres (32 bytes en hex)
   - `D1_DATABASE_ID` - ID de la base de datos D1
   - `R2_BUCKET_NAME` - Nombre del bucket R2
   - `R2_ACCOUNT_ID` - Tu Account ID de Cloudflare

### 2. Verificar Bindings en Cloudflare Pages

1. Settings > Functions
2. **D1 Database bindings**:
   - Variable name: `DB`
   - D1 Database: `coparenting-db-prod`
3. **R2 Bucket bindings**:
   - Variable name: `BUCKET`
   - R2 Bucket: `coparenting-attachments`

### 3. Verificar que los Usuarios Existan en la Base de Datos

Ejecuta este comando para verificar usuarios en producción:

```bash
wrangler d1 execute coparenting-db-prod --remote --command "SELECT email, role, email_verified FROM users LIMIT 10"
```

### 4. Verificar Logs en Cloudflare

1. Ve a tu proyecto en Pages Dashboard
2. Click en **Deployments**
3. Selecciona el deployment más reciente
4. Click en **View Functions Logs**
5. Busca errores relacionados con:
   - `JWT_SECRET is missing`
   - `ENCRYPTION_KEY is missing`
   - `DB is missing`
   - `User not found`
   - `Password validation failed`

### 5. Probar Login con curl

```bash
curl -X POST https://tu-dominio.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria.garcia@example.com","password":"Password123"}' \
  -v
```

Revisa la respuesta y los headers para ver qué error específico está retornando.

## 🐛 Problemas Comunes y Soluciones

### Error: "Server configuration error: JWT_SECRET missing"

**Causa**: La variable de entorno `JWT_SECRET` no está configurada en Cloudflare Pages.

**Solución**:
1. Ve a Settings > Environment Variables
2. Agrega `JWT_SECRET` con el valor: `91ff48a699b0c89a1cad8cfa4672bb45f604e32ff353afaaf8247748b6cb9e26`
3. Asegúrate de seleccionar **Production** environment
4. Guarda y espera a que se despliegue un nuevo build

### Error: "Server configuration error: ENCRYPTION_KEY missing"

**Causa**: La variable de entorno `ENCRYPTION_KEY` no está configurada.

**Solución**:
1. Ve a Settings > Environment Variables
2. Agrega `ENCRYPTION_KEY` con el valor: `a425a7d36012273685ae23311df9dea8c472692fa56f5a35ced6ca25283b0a4a`
3. Asegúrate de seleccionar **Production** environment
4. Guarda y espera a que se despliegue un nuevo build

### Error: "Server configuration error: DB binding missing"

**Causa**: El binding de D1 Database no está configurado.

**Solución**:
1. Ve a Settings > Functions > D1 Database bindings
2. Agrega un binding:
   - Variable name: `DB`
   - D1 Database: `coparenting-db-prod`
3. Guarda y espera a que se despliegue un nuevo build

### Error: "Credenciales inválidas" pero el usuario existe

**Causa**: El password hash en la base de datos no coincide con el password ingresado.

**Solución**:
1. Verifica que el usuario tenga `password_salt` y `password_hash` en la base de datos
2. Si no tiene, necesitas regenerar el password:

```bash
# Generar nuevo hash para un usuario
# Esto requiere ejecutar el script de seed o actualizar manualmente
```

### Error: "User not found"

**Causa**: El usuario no existe en la base de datos de producción.

**Solución**:
1. Verifica que el seed se haya ejecutado en producción
2. Ejecuta el seed de producción:

```bash
# Ver instrucciones en SEED_COMPLETADO.md o EJECUTAR_SEED_PRODUCCION.md
```

## 📝 Verificar que el Seed se Ejecutó Correctamente

```bash
# Verificar usuarios en producción
wrangler d1 execute coparenting-db-prod --remote --command "SELECT COUNT(*) as total FROM users"

# Debería retornar al menos 6 usuarios (2 familias)
```

## 🔄 Forzar Nuevo Deployment

Si cambiaste variables de entorno, necesitas forzar un nuevo deployment:

1. Ve a Deployments
2. Click en el deployment más reciente
3. Click en "Retry deployment" o "Retrigger deployment"

O desde la terminal:

```bash
# Hacer un commit vacío para forzar deployment
git commit --allow-empty -m "Trigger deployment after env var changes"
git push
```

## 📧 Credenciales de Prueba

Si el seed se ejecutó correctamente, deberías poder hacer login con:

- **Email**: `maria.garcia@example.com`
- **Password**: `Password123`

O cualquier otro usuario del seed (ver `CREDENCIALES_DEMO.md`).

## 🆘 Si Nada Funciona

1. Revisa los logs de Functions en Cloudflare Dashboard
2. Verifica que todas las variables de entorno estén en **Production** (no solo Preview)
3. Asegúrate de que el binding de D1 esté configurado para `coparenting-db-prod`
4. Verifica que la base de datos tenga datos (ejecuta el seed si es necesario)
5. Intenta hacer un nuevo deployment después de cambiar las variables
