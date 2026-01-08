#!/bin/bash
# Script para configurar Cloudflare Pages

echo "🚀 Configurando Cloudflare Pages para talk-to-me-nicely"
echo ""

ACCOUNT_ID="abcce3a933dd0f7acbb57599fae04842"
PROJECT_NAME="talk-to-me-nicely"
D1_DATABASE_ID="49b7eeba-6a24-41b8-82d5-e44be4e67098"
R2_BUCKET_NAME="coparenting-attachments"

echo "📋 Información del proyecto:"
echo "  Account ID: $ACCOUNT_ID"
echo "  Project Name: $PROJECT_NAME"
echo "  D1 Database ID: $D1_DATABASE_ID"
echo "  R2 Bucket: $R2_BUCKET_NAME"
echo ""

# Generar secrets
echo "🔐 Generando secrets..."
ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo "✅ Secrets generados (guárdalos de forma segura):"
echo "  ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "  JWT_SECRET=$JWT_SECRET"
echo ""

echo "📝 Próximos pasos:"
echo ""
echo "1. Crear proyecto en Cloudflare Pages:"
echo "   wrangler pages project create $PROJECT_NAME"
echo ""
echo "2. O desde el dashboard:"
echo "   https://dash.cloudflare.com/$ACCOUNT_ID/pages"
echo "   Click en 'Create a project' > 'Connect to Git'"
echo "   Selecciona: gbrey/talk-to-me-nicely"
echo ""
echo "3. Configurar variables de entorno en Pages Dashboard:"
echo "   Settings > Environment Variables > Add variable"
echo ""
echo "   Production:"
echo "   - ENCRYPTION_KEY = $ENCRYPTION_KEY"
echo "   - JWT_SECRET = $JWT_SECRET"
echo "   - D1_DATABASE_ID = $D1_DATABASE_ID"
echo "   - R2_BUCKET_NAME = $R2_BUCKET_NAME"
echo "   - R2_ACCOUNT_ID = $ACCOUNT_ID"
echo ""
echo "4. Configurar bindings en Pages Dashboard:"
echo "   Settings > Functions > D1 Database bindings"
echo "   - Variable name: DB"
echo "   - D1 Database: coparenting-db-prod"
echo ""
echo "   Settings > Functions > R2 Bucket bindings"
echo "   - Variable name: BUCKET"
echo "   - R2 Bucket: $R2_BUCKET_NAME"
echo ""
