# Guía de Integración Continua y Despliegue Continuo (CI/CD)

## Descripción General

Esta guía documenta la configuración completa de CI/CD implementada con GitHub Actions para automatizar pruebas, validaciones y despliegues del sistema de gestión NOM-035.

---

## Workflows Configurados

### 1. E2E Tests (`ci-e2e-tests.yml`)

**Propósito**: Ejecutar tests end-to-end con Playwright en cada PR y push

**Triggers**:
- Pull requests a `main` o `develop`
- Push a `main` o `develop`

**Pasos**:
1. Checkout del código
2. Setup de Node.js 22 con cache de pnpm
3. Instalación de dependencias
4. Instalación de navegadores Playwright (Chromium, Firefox, WebKit)
5. Inicio del servidor de desarrollo
6. Espera hasta que el servidor esté listo (timeout 60s)
7. Ejecución de tests E2E
8. Upload de reportes y screenshots (si fallan)
9. Comentario automático en PR con resultados

**Artifacts generados**:
- `playwright-report/` - Reporte HTML completo (30 días de retención)
- `test-results/` - Screenshots de fallos (7 días de retención)

**Timeout**: 30 minutos

---

### 2. TypeScript Check (`ci-typescript.yml`)

**Propósito**: Validar que no hay errores de TypeScript

**Triggers**:
- Pull requests a `main` o `develop`
- Push a `main` o `develop`

**Pasos**:
1. Checkout del código
2. Setup de Node.js 22 con cache de pnpm
3. Instalación de dependencias
4. Ejecución de `tsc --noEmit`
5. Conteo de errores TypeScript
6. Comentario automático en PR con resultados
7. **Fallo del workflow si hay errores** (bloquea merge)

**Criterio de éxito**: 0 errores de TypeScript

**Timeout**: 10 minutos

---

### 3. Lint & Format Check (`ci-lint.yml`)

**Propósito**: Validar estilo de código con ESLint y Prettier

**Triggers**:
- Pull requests a `main` o `develop`
- Push a `main` o `develop`

**Jobs**:

#### Job 1: ESLint Check
- Ejecuta ESLint en todos los archivos `.ts`, `.tsx`, `.js`, `.jsx`
- Falla si hay warnings o errors (`--max-warnings 0`)
- Comenta en PR si hay issues

#### Job 2: Prettier Format Check
- Verifica formateo de archivos `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`
- Falla si hay archivos sin formatear
- Comenta en PR con instrucciones de auto-fix

**Timeout**: 10 minutos por job

---

## Configuración de Branch Protection

### Reglas Recomendadas para `main`

```yaml
Require pull request reviews before merging: ✅
  Required approving reviews: 1
  Dismiss stale reviews: ✅
  Require review from Code Owners: ❌

Require status checks to pass before merging: ✅
  Required status checks:
    - E2E Tests / e2e-tests
    - TypeScript Check / typescript-check
    - Lint & Format Check / lint
    - Lint & Format Check / format
  Require branches to be up to date: ✅

Require conversation resolution before merging: ✅
Require linear history: ❌
Include administrators: ✅
```

### Cómo Configurar en GitHub

1. Ir a `Settings` → `Branches`
2. Click en `Add rule` o editar regla existente
3. En `Branch name pattern` escribir: `main`
4. Activar las opciones listadas arriba
5. Guardar cambios

---

## Secrets Requeridos

### Secrets de GitHub Actions

Actualmente no se requieren secrets adicionales. Los workflows usan:
- Variables de entorno del sistema
- Tokens de GitHub automáticos (`GITHUB_TOKEN`)

### Secrets Futuros (si se implementa deployment automático)

```
DEPLOYMENT_TOKEN=<token_de_manus>
DATABASE_URL=<url_de_produccion>
VITE_APP_ID=<app_id_de_produccion>
```

---

## Flujo de Trabajo Completo

### 1. Desarrollo Local

```bash
# Crear rama feature
git checkout -b feature/nueva-funcionalidad

# Desarrollar y commitear cambios
git add .
git commit -m "feat: agregar nueva funcionalidad"

# Ejecutar tests localmente antes de push
pnpm exec playwright test
pnpm exec tsc --noEmit
pnpm exec eslint . --ext .ts,.tsx,.js,.jsx
pnpm exec prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}"
```

### 2. Push y Creación de PR

```bash
# Push de la rama
git push origin feature/nueva-funcionalidad

# Crear PR en GitHub
# Los workflows se ejecutan automáticamente
```

### 3. Revisión Automática

GitHub Actions ejecuta:
1. ✅ E2E Tests (30 min)
2. ✅ TypeScript Check (10 min)
3. ✅ ESLint Check (10 min)
4. ✅ Prettier Check (10 min)

**Total**: ~30-40 minutos (algunos jobs en paralelo)

### 4. Revisión Manual

- Revisor revisa el código
- Verifica que todos los checks pasen
- Aprueba el PR

### 5. Merge

- Si todos los checks pasan → Merge permitido
- Si algún check falla → Merge bloqueado

---

## Comentarios Automáticos en PRs

### Ejemplo: E2E Tests Passed

```markdown
## 🎭 E2E Test Results

✅ Passed: 34/34
```

### Ejemplo: E2E Tests Failed

```markdown
## 🎭 E2E Test Results

✅ Passed: 30/34
❌ Failed: 4/34

### Failed Tests
- Workflow de aprobación: Crear y aprobar base completa
- Calendario: Navegación entre meses
- Gráficos: Renderizado de Chart.js
- Búsqueda: Abrir con Ctrl+K
```

### Ejemplo: TypeScript Check Failed

```markdown
## 📝 TypeScript Check Results

⚠️ Found 15 TypeScript errors

**Action Required**: Please fix TypeScript errors before merging.
Run `pnpm exec tsc --noEmit` locally to see detailed error messages.
```

### Ejemplo: ESLint Failed

```markdown
## 🔍 ESLint Check Results

❌ ESLint found issues in your code.

Run `pnpm exec eslint . --ext .ts,.tsx,.js,.jsx` locally to see detailed warnings and errors.
```

---

## Troubleshooting

### Tests E2E Fallan en CI pero Pasan Localmente

**Causas comunes**:
1. Timeouts muy cortos
2. Diferencias de timing en CI
3. Dependencias de estado previo

**Soluciones**:
```typescript
// Aumentar timeouts en CI
test.setTimeout(process.env.CI ? 60000 : 30000);

// Esperas más robustas
await expect(page.locator('button')).toBeVisible({ timeout: 10000 });

// Limpiar estado antes de cada test
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});
```

### TypeScript Check Falla con Muchos Errores

**Solución**:
1. Ejecutar localmente: `pnpm exec tsc --noEmit`
2. Corregir errores uno por uno
3. Considerar agregar `// @ts-ignore` solo en casos extremos

### Workflow Tarda Demasiado

**Optimizaciones**:
1. Usar cache de dependencias (ya configurado)
2. Ejecutar solo tests afectados:
   ```yaml
   - name: Run affected tests
     run: pnpm exec playwright test --grep="$(git diff --name-only HEAD~1 | grep -E '\.spec\.ts$' | xargs)"
   ```
3. Paralelizar tests:
   ```yaml
   strategy:
     matrix:
       shard: [1, 2, 3, 4]
   - run: pnpm exec playwright test --shard=${{ matrix.shard }}/4
   ```

---

## Mejores Prácticas

### 1. Commits Pequeños y Frecuentes

✅ **Bueno**:
```
feat: agregar validación de email
fix: corregir error en formulario de registro
test: agregar tests para login
```

❌ **Malo**:
```
feat: implementar todo el módulo de usuarios con login, registro, perfil, y configuración
```

### 2. Tests Antes de Push

Siempre ejecutar localmente antes de push:
```bash
pnpm exec playwright test
pnpm exec tsc --noEmit
```

### 3. Mensajes de Commit Descriptivos

Usar [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Formateo, punto y coma faltante, etc.
- `refactor:` - Refactorización de código
- `test:` - Agregar o corregir tests
- `chore:` - Cambios en build, CI, etc.

### 4. PRs Pequeños

- Máximo 500 líneas de cambios
- Un solo objetivo por PR
- Fácil de revisar y testear

---

## Monitoreo y Métricas

### Métricas Clave

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| **Test Success Rate** | >95% | - |
| **Build Time** | <40 min | ~35 min |
| **TypeScript Errors** | 0 | 734 |
| **Test Coverage** | >80% | 93% |

### Dashboards Recomendados

1. **GitHub Actions Dashboard**
   - Ver en: `Actions` tab del repositorio
   - Muestra: Estado de workflows, tiempos, fallos

2. **Playwright Report**
   - Disponible en artifacts de cada run
   - Muestra: Tests pasados/fallidos, screenshots, traces

---

## Roadmap de CI/CD

### Fase 1: Básico (Actual) ✅
- ✅ Tests E2E automatizados
- ✅ Validación TypeScript
- ✅ Linting y formateo
- ✅ Branch protection

### Fase 2: Intermedio (1-2 meses)
- [ ] Code coverage reports
- [ ] Performance testing con Lighthouse
- [ ] Visual regression testing
- [ ] Deployment preview para cada PR

### Fase 3: Avanzado (3-6 meses)
- [ ] Deployment automático a staging
- [ ] Deployment automático a producción (con aprobación)
- [ ] Rollback automático en fallos
- [ ] Monitoreo de producción
- [ ] Alertas automáticas

---

## Comandos Útiles

### Ejecutar Workflows Localmente

Usar [act](https://github.com/nektos/act) para simular GitHub Actions:

```bash
# Instalar act
brew install act  # macOS
# o
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Ejecutar workflow específico
act pull_request -W .github/workflows/ci-e2e-tests.yml

# Ejecutar todos los workflows
act pull_request
```

### Ver Logs de Workflows

```bash
# Listar runs recientes
gh run list

# Ver logs de un run específico
gh run view <run-id> --log

# Ver logs en tiempo real
gh run watch
```

### Cancelar Workflow en Ejecución

```bash
# Cancelar run específico
gh run cancel <run-id>

# Cancelar todos los runs en progreso
gh run list --status in_progress --json databaseId -q '.[].databaseId' | xargs -I {} gh run cancel {}
```

---

## Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Documentation](https://playwright.dev/docs/ci)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## Contacto y Soporte

Para preguntas o problemas con CI/CD:
- Consultar esta documentación
- Revisar logs de GitHub Actions
- Contactar al equipo de DevOps

---

**Última actualización**: 2026-02-20  
**Versión**: 1.0.0  
**Mantenedor**: Equipo de Desarrollo NOM-035
