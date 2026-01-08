# Credenciales de Prueba para Demo

## 👨‍👩‍👧 Familia García

### Padres
- **María García** (Padre 1)
  - Email: `maria.garcia@example.com`
  - Password: `Password123`
  - Rol: Parent

- **Juan García** (Padre 2)
  - Email: `juan.garcia@example.com`
  - Password: `Password123`
  - Rol: Parent

### Hijo
- **Sofía García**
  - Email: `sofia.garcia@example.com`
  - Password: `1234`
  - Rol: Child

### Profesional
- **Dr. Martínez** (Abogado)
  - Email: `abogado.martinez@example.com`
  - Password: `Password123`
  - Rol: Professional
  - Acceso: Aprobado por ambos padres

---

## 👨‍👩‍👦 Familia López

### Padres
- **Ana López** (Padre 1)
  - Email: `ana.lopez@example.com`
  - Password: `Password123`
  - Rol: Parent

- **Carlos López** (Padre 2)
  - Email: `carlos.lopez@example.com`
  - Password: `Password123`
  - Rol: Parent

### Hijo
- **Lucas López**
  - Email: `lucas.lopez@example.com`
  - Password: `1234`
  - Rol: Child

---

## 📊 Datos de Ejemplo Incluidos

### Mensajes
- 6 mensajes en diferentes canales (daily, health, school, calendar, vacation)
- Algunos marcados como "compartir con hijo"
- Timestamps de los últimos 7 días

### Eventos de Calendario
- Retiro de Sofía (en 2 días)
- Cita con Pediatra (en 4 días)
- Reunión de Padres (en 7 días)
- Vacaciones de Invierno (en 30 días)
- Entrega de Sofía (mañana)

### Acceso Profesional
- Abogado con acceso completo a Familia García
- Aprobado por ambos padres
- Puede ver mensajes y calendario (read-only)
- Puede generar reportes

---

## 🚀 Cómo Ejecutar el Seed

### Opción 1: Script Automático
```bash
./seed-demo.sh
```

### Opción 2: Manualmente
1. Asegúrate de que el servidor esté corriendo:
```bash
npm run dev
```

2. En otra terminal, ejecuta:
```bash
curl -X POST http://localhost:8788/api/seed
```

### Opción 3: Desde el Navegador
Abre la consola del desarrollador y ejecuta:
```javascript
fetch('/api/seed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

---

## 🎯 Escenarios de Demo

### Demo 1: Flujo de Padres
1. Login como `maria.garcia@example.com`
2. Ver dashboard con familia
3. Ir a Mensajes y ver conversación
4. Enviar un mensaje nuevo
5. Usar "Revisar Tono" antes de enviar
6. Ver calendario con eventos

### Demo 2: Vista del Hijo
1. Login como `sofia.garcia@example.com`
2. Ver vista simplificada
3. Ver solo mensajes compartidos
4. Ver calendario con eventos relevantes

### Demo 3: Vista Profesional
1. Login como `abogado.martinez@example.com`
2. Ver mensajes (read-only)
3. Ver calendario (read-only)
4. Generar un reporte

### Demo 4: Gestión de Familia
1. Login como `maria.garcia@example.com`
2. Generar código de invitación
3. Login como `juan.garcia@example.com` (ya está en la familia)
4. Ver miembros de la familia

---

## ⚠️ Notas Importantes

- Todos los passwords están hasheados correctamente
- Todos los usuarios tienen email verificado
- Los datos se pueden ejecutar múltiples veces (usa INSERT OR IGNORE)
- Para limpiar datos, elimina `.wrangler/state/v3/d1` y vuelve a ejecutar migraciones
