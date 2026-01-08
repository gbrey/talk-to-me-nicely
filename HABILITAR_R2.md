# Cómo Habilitar R2 en Cloudflare

El error indica que R2 no está habilitado en tu cuenta. Sigue estos pasos:

## Pasos para Habilitar R2

1. **Ve al Dashboard de Cloudflare**
   - Abre: https://dash.cloudflare.com
   - Inicia sesión con tu cuenta

2. **Navega a R2**
   - En el menú lateral izquierdo, busca **R2** (puede estar en "Workers & Pages" o directamente en el menú)
   - O ve directamente a: https://dash.cloudflare.com/r2

3. **Habilita R2**
   - Si es la primera vez, verás un botón o mensaje para "Enable R2" o "Get Started"
   - Click en **Enable R2** o **Create bucket**
   - Acepta los términos si es necesario

4. **Verifica que esté habilitado**
   - Deberías ver la interfaz de R2 con opción de crear buckets

## Alternativa: Crear Bucket desde el Dashboard

Si prefieres crear el bucket desde la interfaz web:

1. Ve a https://dash.cloudflare.com/r2
2. Click en **Create bucket**
3. Nombre del bucket: `coparenting-attachments`
4. Location: Elige la región más cercana (ej: `WNAM` para West North America)
5. Click en **Create bucket**

## Después de Habilitar R2

Una vez habilitado, puedes crear el bucket desde la línea de comandos:

```bash
wrangler r2 bucket create coparenting-attachments
```

O si ya lo creaste desde el dashboard, simplemente continúa con la configuración de Pages.

## Nota sobre R2

R2 es el servicio de almacenamiento de objetos de Cloudflare (similar a S3). 
- **Gratis**: 10 GB de almacenamiento y 1 millón de operaciones de lectura/mes
- **Pago**: Después de los límites gratuitos

Para esta aplicación, el plan gratuito debería ser suficiente para empezar.
