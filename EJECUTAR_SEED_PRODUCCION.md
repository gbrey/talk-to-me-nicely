# Cómo Ejecutar el Seed en Producción

El seed crea los datos de prueba para hacer una demo rápida. Aquí tienes varias opciones para ejecutarlo en producción.

## 📋 ¿Qué crea el seed?

- **7 usuarios de prueba** (padres, hijos, profesional)
- **2 familias** (García y López)
- **6 mensajes** de ejemplo en diferentes canales
- **5 eventos** de calendario
- **1 acceso profesional** configurado

Ver `CREDENCIALES_DEMO.md` para todas las credenciales.

---

## Opción 1: Desde tu Máquina Local (Recomendado)

### Paso 1: Habilitar el endpoint de seed temporalmente

1. Edita `functions/api/[[path]].ts`
2. Descomenta temporalmente el código del seed (líneas del caso 'seed')
3. O crea un endpoint temporal

### Paso 2: Ejecutar localmente conectado a producción

```bash
# Asegúrate de tener wrangler.toml configurado con la base de producción
npm run dev

# En otra terminal, ejecuta:
curl -X POST http://localhost:8788/api/seed
```

### Paso 3: Deshabilitar el endpoint nuevamente

Después de ejecutar el seed, vuelve a comentar/eliminar el código del seed.

---

## Opción 2: Usando Wrangler D1 Execute (Más Seguro)

### Crear un script SQL del seed

Ya existe `scripts/seed-sql.sql` pero está incompleto. Puedes:

1. Ejecutar el seed localmente y capturar las queries SQL
2. O crear un script SQL manualmente con los datos

### Ejecutar en producción

```bash
# Ejecutar queries SQL directamente
wrangler d1 execute coparenting-db-prod --remote --file=scripts/seed-sql.sql
```

---

## Opción 3: Crear un Endpoint Temporal en Producción

### Paso 1: Agregar endpoint temporal

Crea `functions/api/seed-temp.ts`:

```typescript
// Endpoint temporal - ELIMINAR después de usar
import { seedDatabase } from '../../../scripts/seed';

export async function onRequestPost(context: {
  request: Request;
  env: { DB: any };
}): Promise<Response> {
  // Proteger con una clave secreta
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader !== 'Bearer YOUR_SECRET_KEY') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await seedDatabase(context.env.DB);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Paso 2: Agregar al router

En `functions/api/[[path]].ts`, agrega temporalmente:

```typescript
if (resource === 'seed-temp') {
  return { endpoint: 'seed-temp:run', params: {} };
}
```

### Paso 3: Ejecutar

```bash
curl -X POST https://talk-to-me-nicely.pages.dev/api/seed-temp \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

### Paso 4: Eliminar después de usar

**IMPORTANTE**: Elimina el endpoint después de ejecutar el seed por seguridad.

---

## Opción 4: Usar la Consola de Cloudflare

1. Ve a Cloudflare Dashboard > D1
2. Selecciona `coparenting-db-prod`
3. Ve a la pestaña "Console"
4. Ejecuta las queries SQL manualmente

---

## ⚠️ Advertencias

1. **No ejecutes el seed múltiples veces** sin limpiar primero - causará errores de UNIQUE constraint
2. **Elimina el endpoint de seed** después de usarlo en producción
3. **El seed es solo para desarrollo/demo** - no lo uses en producción real con datos de usuarios reales

---

## 🧹 Limpiar Datos de Prueba

Si necesitas limpiar los datos de prueba:

```sql
-- Ejecutar en D1 Console o con wrangler
DELETE FROM professional_access;
DELETE FROM calendar_events;
DELETE FROM messages;
DELETE FROM family_members;
DELETE FROM families;
DELETE FROM user_consents;
DELETE FROM users WHERE email LIKE '%@example.com';
```

---

## ✅ Verificar que Funcionó

Después de ejecutar el seed, prueba hacer login con:
- `maria.garcia@example.com` / `Password123`

Si puedes hacer login y ver la familia, el seed funcionó correctamente.
