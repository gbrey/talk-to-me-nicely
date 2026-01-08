# Configuración de Cloudflare Pages - Guía Paso a Paso

## 🔐 Secrets Generados (¡GUÁRDALOS!)

```
ENCRYPTION_KEY=a425a7d36012273685ae23311df9dea8c472692fa56f5a35ced6ca25283b0a4a
JWT_SECRET=91ff48a699b0c89a1cad8cfa4672bb45f604e32ff353afaaf8247748b6cb9e26
```

## 📋 Información del Proyecto

- **Account ID**: `abcce3a933dd0f7acbb57599fae04842`
- **D1 Database ID**: `49b7eeba-6a24-41b8-82d5-e44be4e67098`
- **R2 Bucket**: `coparenting-attachments`
- **GitHub Repo**: `gbrey/talk-to-me-nicely`

---

## Paso 1: Crear Proyecto en Cloudflare Pages

### Opción A: Desde el Dashboard (Recomendado)

1. Ve a: https://dash.cloudflare.com/abcce3a933dd0f7acbb57599fae04842/pages
2. Click en **"Create a project"**
3. Selecciona **"Connect to Git"**
4. Autoriza Cloudflare a acceder a GitHub si es necesario
5. Selecciona el repositorio: **`gbrey/talk-to-me-nicely`**
6. Click en **"Begin setup"**
7. Configuración:
   - **Project name**: `talk-to-me-nicely`
   - **Production branch**: `main`
   - **Build command**: (dejar vacío)
   - **Build output directory**: `public`
   - **Root directory**: `/` (raíz)
8. Click en **"Save and Deploy"**

### Opción B: Desde Wrangler CLI

```bash
wrangler pages project create talk-to-me-nicely --production-branch=main
```

---

## Paso 2: Configurar Variables de Entorno

1. Ve a tu proyecto en Pages: https://dash.cloudflare.com/abcce3a933dd0f7acbb57599fae04842/pages/view/talk-to-me-nicely
2. Click en **Settings** > **Environment Variables**
3. Selecciona **Production** (o "Add variable" y selecciona Production)
4. Agrega las siguientes variables:

| Variable | Valor |
|----------|-------|
| `ENCRYPTION_KEY` | `a425a7d36012273685ae23311df9dea8c472692fa56f5a35ced6ca25283b0a4a` |
| `JWT_SECRET` | `91ff48a699b0c89a1cad8cfa4672bb45f604e32ff353afaaf8247748b6cb9e26` |
| `D1_DATABASE_ID` | `49b7eeba-6a24-41b8-82d5-e44be4e67098` |
| `R2_BUCKET_NAME` | `coparenting-attachments` |
| `R2_ACCOUNT_ID` | `abcce3a933dd0f7acbb57599fae04842` |

5. Click en **Save** después de cada variable

---

## Paso 3: Configurar Bindings de D1

1. En el mismo proyecto, ve a **Settings** > **Functions**
2. Scroll hasta **D1 Database bindings**
3. Click en **Add binding**
4. Configura:
   - **Variable name**: `DB`
   - **D1 Database**: Selecciona `coparenting-db-prod` del dropdown
5. Click en **Save**

---

## Paso 4: Configurar Bindings de R2

1. En la misma página de Functions, scroll hasta **R2 Bucket bindings**
2. Click en **Add binding**
3. Configura:
   - **Variable name**: `BUCKET`
   - **R2 Bucket**: Selecciona `coparenting-attachments` del dropdown
4. Click en **Save**

---

## Paso 5: Verificar Deployment

1. Después de configurar todo, el proyecto debería hacer un nuevo deployment automáticamente
2. Ve a la pestaña **Deployments**
3. Espera a que el deployment termine (debería mostrar "Success")
4. Click en el deployment para ver la URL
5. La URL será algo como: `https://talk-to-me-nicely.pages.dev`

---

## Paso 6: Probar la Aplicación

1. Abre la URL de tu aplicación
2. Deberías ver la página de login
3. Prueba crear una cuenta o hacer login

---

## Paso 7: Ejecutar Seed en Producción (Opcional)

Para poblar la base de datos con datos de prueba:

```bash
curl -X POST https://talk-to-me-nicely.pages.dev/api/seed
```

O desde el navegador, abre la consola y ejecuta:

```javascript
fetch('/api/seed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

---

## 🔍 Troubleshooting

### Error: Database not found
- Verifica que el binding `DB` esté configurado correctamente
- Verifica que `D1_DATABASE_ID` en variables de entorno sea correcto

### Error: R2 bucket not found
- Verifica que el binding `BUCKET` esté configurado
- Verifica que el bucket `coparenting-attachments` exista

### Error: Function timeout
- Ve a Settings > Functions > Limits
- Aumenta el timeout si es necesario

### Deployment falla
- Revisa los logs en la pestaña Deployments
- Verifica que todas las variables de entorno estén configuradas

---

## 📚 URLs Útiles

- **Dashboard Pages**: https://dash.cloudflare.com/abcce3a933dd0f7acbb57599fae04842/pages
- **Tu Proyecto**: https://dash.cloudflare.com/abcce3a933dd0f7acbb57599fae04842/pages/view/talk-to-me-nicely
- **D1 Databases**: https://dash.cloudflare.com/abcce3a933dd0f7acbb57599fae04842/workers/d1
- **R2 Buckets**: https://dash.cloudflare.com/abcce3a933dd0f7acbb57599fae04842/r2
