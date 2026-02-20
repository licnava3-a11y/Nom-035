#!/bin/bash

# Script para ejecutar tests E2E con Playwright en múltiples navegadores
# Genera reportes HTML y captura screenshots de fallos

set -e

echo "🧪 Iniciando suite de tests E2E con Playwright..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que el servidor esté corriendo
echo "📡 Verificando servidor de desarrollo..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Error: El servidor de desarrollo no está corriendo${NC}"
    echo "Por favor ejecuta: pnpm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Servidor corriendo en http://localhost:3000${NC}"
echo ""

# Verificar que los navegadores estén instalados
echo "🌐 Verificando navegadores de Playwright..."
if ! pnpm exec playwright --version > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Playwright no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Playwright instalado${NC}"
echo ""

# Crear directorio para reportes
mkdir -p test-results
mkdir -p playwright-report

# Función para ejecutar tests en un navegador específico
run_browser_tests() {
    local browser=$1
    local browser_name=$2
    
    echo -e "${YELLOW}🚀 Ejecutando tests en ${browser_name}...${NC}"
    
    if pnpm exec playwright test --project=$browser --reporter=html,json; then
        echo -e "${GREEN}✓ Tests en ${browser_name} completados exitosamente${NC}"
        return 0
    else
        echo -e "${RED}✗ Algunos tests fallaron en ${browser_name}${NC}"
        return 1
    fi
}

# Ejecutar tests en cada navegador
echo "═══════════════════════════════════════════════════════"
echo "  EJECUTANDO SUITE COMPLETA DE TESTS E2E"
echo "═══════════════════════════════════════════════════════"
echo ""

# Chromium
run_browser_tests "chromium" "Chromium (Chrome)"
chromium_status=$?
echo ""

# Firefox
run_browser_tests "firefox" "Firefox"
firefox_status=$?
echo ""

# WebKit (Safari)
run_browser_tests "webkit" "WebKit (Safari)"
webkit_status=$?
echo ""

# Mobile Chrome
echo -e "${YELLOW}🚀 Ejecutando tests en Mobile Chrome...${NC}"
if pnpm exec playwright test --project="Mobile Chrome" --reporter=html,json; then
    echo -e "${GREEN}✓ Tests en Mobile Chrome completados${NC}"
    mobile_chrome_status=0
else
    echo -e "${RED}✗ Algunos tests fallaron en Mobile Chrome${NC}"
    mobile_chrome_status=1
fi
echo ""

# Mobile Safari
echo -e "${YELLOW}🚀 Ejecutando tests en Mobile Safari...${NC}"
if pnpm exec playwright test --project="Mobile Safari" --reporter=html,json; then
    echo -e "${GREEN}✓ Tests en Mobile Safari completados${NC}"
    mobile_safari_status=0
else
    echo -e "${RED}✗ Algunos tests fallaron en Mobile Safari${NC}"
    mobile_safari_status=1
fi
echo ""

# Resumen de resultados
echo "═══════════════════════════════════════════════════════"
echo "  RESUMEN DE RESULTADOS"
echo "═══════════════════════════════════════════════════════"
echo ""

total_failures=0

if [ $chromium_status -eq 0 ]; then
    echo -e "${GREEN}✓ Chromium: PASS${NC}"
else
    echo -e "${RED}✗ Chromium: FAIL${NC}"
    ((total_failures++))
fi

if [ $firefox_status -eq 0 ]; then
    echo -e "${GREEN}✓ Firefox: PASS${NC}"
else
    echo -e "${RED}✗ Firefox: FAIL${NC}"
    ((total_failures++))
fi

if [ $webkit_status -eq 0 ]; then
    echo -e "${GREEN}✓ WebKit: PASS${NC}"
else
    echo -e "${RED}✗ WebKit: FAIL${NC}"
    ((total_failures++))
fi

if [ $mobile_chrome_status -eq 0 ]; then
    echo -e "${GREEN}✓ Mobile Chrome: PASS${NC}"
else
    echo -e "${RED}✗ Mobile Chrome: FAIL${NC}"
    ((total_failures++))
fi

if [ $mobile_safari_status -eq 0 ]; then
    echo -e "${GREEN}✓ Mobile Safari: PASS${NC}"
else
    echo -e "${RED}✗ Mobile Safari: FAIL${NC}"
    ((total_failures++))
fi

echo ""
echo "═══════════════════════════════════════════════════════"

if [ $total_failures -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todos los tests pasaron exitosamente!${NC}"
    echo ""
    echo "📊 Reporte HTML disponible en: playwright-report/index.html"
    echo "Para ver el reporte: pnpm exec playwright show-report"
    exit 0
else
    echo -e "${RED}⚠️  $total_failures navegador(es) con tests fallidos${NC}"
    echo ""
    echo "📊 Reporte HTML disponible en: playwright-report/index.html"
    echo "📸 Screenshots de fallos en: test-results/"
    echo "Para ver el reporte: pnpm exec playwright show-report"
    exit 1
fi
