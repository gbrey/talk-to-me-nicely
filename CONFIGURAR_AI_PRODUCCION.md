# Configurar Workers AI en Producción

Para que la validación de IA funcione en producción, necesitas configurar el binding de Workers AI en Cloudflare Pages.

## Pasos para Configurar

1. **Ve al Dashboard de Cloudflare Pages:**
   - https://dash.cloudflare.com
   - Selecciona tu cuenta
   - Ve a **Workers & Pages** > **Pages**
   - Selecciona el proyecto `talk-to-me-nicely`

2. **Configurar AI Binding:**
   - Click en **Settings** (Configuración)
   - Ve a la sección **Functions**
   - Busca **AI bindings** o **Workers AI**
   - Click en **Add binding** o **Edit bindings**

3. **Agregar el Binding:**
   - **Variable name:** `AI` (debe ser exactamente "AI" en mayúsculas)
   - **Workers AI:** Selecciona o habilita Workers AI
   - Si no ves la opción, primero necesitas habilitar Workers AI en tu cuenta:
     - Ve a **Workers & Pages** > **Workers AI**
     - Habilita Workers AI si aún no está habilitado

4. **Guardar y Redesplegar:**
   - Guarda los cambios
   - Cloudflare Pages debería redesplegar automáticamente
   - O puedes hacer un nuevo deployment desde GitHub

## Verificar que Funciona

Después de configurar, puedes verificar en los logs de Cloudflare:

1. Ve a tu proyecto en Pages
2. Click en **Logs** o **Real-time Logs**
3. Intenta enviar un mensaje como padre
4. Deberías ver en los logs: `"AI binding available, using Cloudflare Workers AI"`
5. Si ves: `"AI binding NOT available"`, entonces el binding no está configurado correctamente

## Troubleshooting

### Si no ves la opción de AI bindings:
- Asegúrate de tener Workers AI habilitado en tu cuenta
- Algunas cuentas necesitan habilitarlo manualmente desde Workers AI dashboard

### Si el binding está configurado pero no funciona:
- Verifica que el nombre de la variable sea exactamente `AI` (mayúsculas)
- Verifica que el proyecto se haya redesplegado después de agregar el binding
- Revisa los logs para ver si hay errores

### Si quieres verificar localmente:
- El binding funciona en desarrollo local con `npm run dev` (usa `--ai` flag)
- En producción, debe estar configurado en el dashboard

## Nota Importante

Sin el binding AI configurado, el sistema usará un análisis básico que:
- ✅ Detecta lenguaje agresivo básico
- ✅ Detecta mayúsculas excesivas
- ❌ NO detecta borrachera
- ❌ NO tiene validación cultural argentina avanzada

Por eso es importante configurar el binding AI para tener la validación completa.
