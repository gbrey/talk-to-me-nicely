# Configurar Analytics para la App

Hay dos tipos de analytics disponibles:

## 1. Cloudflare Web Analytics (Recomendado para empezar)

**Ventajas:**
- ✅ Gratis
- ✅ Sin cookies (privacidad)
- ✅ Fácil de implementar
- ✅ Métricas básicas de tráfico

**Pasos para configurar:**

1. Ve a Cloudflare Dashboard > **Analytics & Logs** > **Web Analytics**
2. Click en **Add a site**
3. Ingresa tu dominio (ej: `talk-to-me-nicely.pages.dev`)
4. Cloudflare te dará un script que se ve así:
   ```html
   <script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
           data-cf-beacon='{"token": "TU_TOKEN_AQUI"}'></script>
   ```
5. Extrae el token del script
6. Agrega el token a las variables de entorno en Cloudflare Pages:
   - Variable name: `CF_WEB_ANALYTICS_TOKEN`
   - Valor: El token que extrajiste

**Alternativa más simple (sin variables de entorno):**
Puedes agregar el script directamente en las páginas HTML antes de `</body>`:
```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "TU_TOKEN_AQUI"}'></script>
```

**Nota:** El código ya está preparado para usar el token desde variables de entorno, pero también puedes agregarlo directamente en el HTML.

## 2. Analytics Interno (Dashboard de métricas de la app)

**Ventajas:**
- ✅ Métricas específicas de la app (mensajes enviados, validaciones IA, etc.)
- ✅ Usa los datos de `audit_log` que ya tienes
- ✅ Dashboard personalizado

**Acceso:**
- Ve a `/analytics.html` (solo para usuarios admin o profesionales)
- Muestra métricas como:
  - Mensajes enviados por día
  - Validaciones de IA realizadas
  - Usuarios activos
  - Canales más usados
  - Etc.

## 3. Cloudflare Dashboard Analytics (Ya disponible)

**Ventajas:**
- ✅ Ya está disponible sin configuración
- ✅ Métricas de tráfico básicas

**Acceso:**
- Ve a Cloudflare Dashboard > **Analytics & Logs** > **Analytics**
- Selecciona tu dominio/proyecto

## Recomendación

Para empezar rápido:
1. Configura Cloudflare Web Analytics (opción 1)
2. Usa el dashboard interno (opción 2) para métricas específicas de la app

Ambos son complementarios y te dan una visión completa del uso de la aplicación.
