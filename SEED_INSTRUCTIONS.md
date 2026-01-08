# Instrucciones para Ejecutar el Seed

Este documento explica cómo poblar la base de datos con datos de prueba para hacer una demo rápida.

## Método 1: Usando el Endpoint API (Recomendado)

1. Asegúrate de que el servidor de desarrollo esté corriendo:
```bash
npm run dev
```

2. Ejecuta el seed haciendo una petición POST:
```bash
curl -X POST http://localhost:8788/api/seed
```

O desde el navegador, abre la consola del desarrollador y ejecuta:
```javascript
fetch('/api/seed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

## Método 2: Usando Wrangler D1 Execute

Si prefieres ejecutar directamente contra la base de datos:

```bash
# Primero, necesitarías convertir el script TypeScript a SQL
# O usar el archivo seed-sql.sql (parcial)
wrangler d1 execute DB --file=./scripts/seed-sql.sql
```

## Usuarios de Prueba Creados

### Familia García

**Padre 1 (María García)**
- Email: `maria.garcia@example.com`
- Password: `Password123`
- Rol: Parent

**Padre 2 (Juan García)**
- Email: `juan.garcia@example.com`
- Password: `Password123`
- Rol: Parent

**Hijo (Sofía García)**
- Email: `sofia.garcia@example.com`
- Password: `1234`
- Rol: Child

**Profesional (Dr. Martínez)**
- Email: `abogado.martinez@example.com`
- Password: `Password123`
- Rol: Professional

### Familia López

**Padre 1 (Ana López)**
- Email: `ana.lopez@example.com`
- Password: `Password123`
- Rol: Parent

**Padre 2 (Carlos López)**
- Email: `carlos.lopez@example.com`
- Password: `Password123`
- Rol: Parent

**Hijo (Lucas López)**
- Email: `lucas.lopez@example.com`
- Password: `1234`
- Rol: Child

## Datos Creados

El seed crea:

1. **7 usuarios** (4 padres, 2 hijos, 1 profesional)
2. **2 familias** (García y López)
3. **7 miembros** asociados a las familias
4. **6 mensajes** de ejemplo en diferentes canales
5. **5 eventos** de calendario (pickups, citas médicas, vacaciones, etc.)
6. **1 acceso profesional** (abogado con acceso a Familia García)

## Notas

- Los passwords están hasheados correctamente
- Todos los usuarios tienen email verificado
- Los mensajes tienen timestamps de los últimos 7 días
- Los eventos están distribuidos en el futuro próximo
- El acceso profesional está aprobado por ambos padres

## Limpiar Datos

Si necesitas limpiar los datos de prueba, puedes:

1. Eliminar la base de datos local:
```bash
rm -rf .wrangler/state/v3/d1
```

2. Volver a ejecutar las migraciones:
```bash
wrangler d1 migrations apply DB
```

3. Ejecutar el seed nuevamente
