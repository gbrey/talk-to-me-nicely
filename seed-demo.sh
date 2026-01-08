#!/bin/bash
# Script para ejecutar el seed de datos de prueba

echo "🌱 Ejecutando seed de datos de prueba..."
echo ""
echo "Asegúrate de que el servidor esté corriendo en http://localhost:8788"
echo ""

# Esperar un momento para que el servidor esté listo
sleep 2

# Ejecutar el seed
response=$(curl -s -X POST http://localhost:8788/api/seed)

if [ $? -eq 0 ]; then
    echo "✅ Seed ejecutado exitosamente!"
    echo ""
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
    echo "📋 Credenciales de prueba:"
    echo ""
    echo "👨‍👩‍👧 Familia García:"
    echo "  Padre 1: maria.garcia@example.com / Password123"
    echo "  Padre 2: juan.garcia@example.com / Password123"
    echo "  Hijo: sofia.garcia@example.com / 1234"
    echo "  Profesional: abogado.martinez@example.com / Password123"
    echo ""
    echo "👨‍👩‍👦 Familia López:"
    echo "  Padre 1: ana.lopez@example.com / Password123"
    echo "  Padre 2: carlos.lopez@example.com / Password123"
    echo "  Hijo: lucas.lopez@example.com / 1234"
else
    echo "❌ Error: No se pudo conectar al servidor"
    echo "Asegúrate de que el servidor esté corriendo con: npm run dev"
fi
