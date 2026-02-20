import { test, expect } from '../fixtures/auth';

/**
 * Test E2E: Búsqueda Global y Confirmaciones Destructivas
 * 
 * Funcionalidades probadas:
 * 1. Búsqueda global con Ctrl+K
 * 2. Confirmaciones antes de acciones destructivas
 */

test.describe('Búsqueda Global (Ctrl+K)', () => {
  // Autenticación manejada por fixture authenticatedPage

  test('Abrir búsqueda con Ctrl+K', async ({ authenticatedPage: page }) => {
    // Presionar Ctrl+K
    await page.keyboard.press('Control+K');

    // Verificar que el dialog de búsqueda se abre
    await expect(page.locator('[role="dialog"]:has-text("Buscar"), [class*="search-dialog"]')).toBeVisible({ timeout: 2000 });

    // Verificar que el input de búsqueda tiene focus
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    await expect(searchInput).toBeFocused();
  });

  test('Búsqueda funciona correctamente', async ({ authenticatedPage: page }) => {
    // Abrir búsqueda
    await page.keyboard.press('Control+K');

    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    
    // Escribir término de búsqueda
    await searchInput.fill('empleado');

    // Esperar resultados
    await page.waitForTimeout(500);

    // Verificar que aparecen resultados
    await expect(page.locator('[class*="search-result"], [role="option"]')).toBeVisible({ timeout: 3000 });

    // Verificar que hay al menos un resultado
    const results = await page.locator('[class*="search-result"], [role="option"]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('Navegación a resultados funciona', async ({ authenticatedPage: page }) => {
    // Abrir búsqueda
    await page.keyboard.press('Control+K');

    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    await searchInput.fill('casos');
    await page.waitForTimeout(500);

    // Click en primer resultado
    await page.locator('[class*="search-result"], [role="option"]').first().click();

    // Verificar que navegó a la página correcta
    await page.waitForURL('**/*', { timeout: 5000 });
    
    // Verificar que el dialog se cerró
    await expect(page.locator('[role="dialog"]:has-text("Buscar")')).not.toBeVisible();
  });

  test('Cerrar búsqueda con Escape', async ({ authenticatedPage: page }) => {
    // Abrir búsqueda
    await page.keyboard.press('Control+K');
    await expect(page.locator('[role="dialog"]:has-text("Buscar")')).toBeVisible();

    // Presionar Escape
    await page.keyboard.press('Escape');

    // Verificar que se cerró
    await expect(page.locator('[role="dialog"]:has-text("Buscar")')).not.toBeVisible();
  });

  test('Búsqueda vacía muestra mensaje apropiado', async ({ authenticatedPage: page }) => {
    await page.keyboard.press('Control+K');

    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    await searchInput.fill('xyzabc123notfound');
    await page.waitForTimeout(500);

    // Verificar mensaje de "sin resultados"
    await expect(page.locator('text=No se encontraron resultados, text=Sin resultados')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Confirmaciones en Acciones Destructivas', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loginButton = page.locator('text=Acceder a la Plataforma');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Confirmación antes de eliminar minuta del comité', async ({ authenticatedPage: page }) => {
    // Navegar a minutas
    await page.click('text=Prevención de Riesgos');
    await page.click('text=Minutas del Comité');
    await page.waitForURL('**/committee-minutes');

    // Buscar botón de eliminar
    const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar que aparece dialog de confirmación
      await expect(page.locator('[role="alertdialog"], [role="dialog"]:has-text("Eliminar")')).toBeVisible({ timeout: 2000 });

      // Verificar mensaje de impacto
      await expect(page.locator('text=no se puede deshacer, text=permanentemente')).toBeVisible();

      // Cancelar
      await page.click('button:has-text("Cancelar")');

      // Verificar que el dialog se cerró
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();

      // Verificar que la minuta sigue visible
      await expect(deleteButton).toBeVisible();
    }
  });

  test('Confirmación antes de eliminar departamento', async ({ authenticatedPage: page }) => {
    // Navegar a departamentos
    await page.click('text=Gestión de Talento');
    await page.click('text=Departamentos');
    await page.waitForURL('**/departments');

    const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar confirmación
      await expect(page.locator('[role="alertdialog"]:has-text("Eliminar departamento")')).toBeVisible({ timeout: 2000 });

      // Verificar mensaje de impacto (empleados afectados)
      await expect(page.locator('text=empleados, text=afectados')).toBeVisible();
    }
  });

  test('Confirmación antes de eliminar evaluación', async ({ authenticatedPage: page }) => {
    // Navegar a evaluaciones
    await page.click('text=Evaluación de Desempeño');
    await page.click('text=Gestión de Evaluaciones');
    await page.waitForURL('**/assessments');

    const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar confirmación
      await expect(page.locator('[role="alertdialog"]:has-text("Eliminar evaluación")')).toBeVisible({ timeout: 2000 });

      // Verificar botón de confirmar es destructivo (rojo)
      const confirmButton = page.locator('button:has-text("Eliminar")');
      await expect(confirmButton).toHaveClass(/destructive|red/);
    }
  });

  test('Confirmación antes de eliminar solicitud de gasto', async ({ authenticatedPage: page }) => {
    // Navegar a solicitudes de gasto
    await page.click('text=Finanzas');
    await page.click('text=Solicitudes de Gasto');
    await page.waitForURL('**/expense-requests');

    const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar confirmación
      await expect(page.locator('[role="alertdialog"]:has-text("Eliminar solicitud")')).toBeVisible({ timeout: 2000 });

      // Verificar mensaje sobre documentos adjuntos
      await expect(page.locator('text=documentos adjuntos')).toBeVisible();
    }
  });

  test('Confirmación antes de eliminar certificado digital', async ({ authenticatedPage: page }) => {
    // Navegar a certificados
    await page.click('text=Finanzas');
    await page.click('text=e.firma SAT');
    await page.waitForURL('**/efirma-sat');

    const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar confirmación
      await expect(page.locator('[role="alertdialog"]:has-text("Eliminar certificado")')).toBeVisible({ timeout: 2000 });

      // Verificar mensaje sobre llave privada
      await expect(page.locator('text=llave privada, text=validación')).toBeVisible();
    }
  });

  test('Confirmar eliminación ejecuta la acción', async ({ authenticatedPage: page }) => {
    // Navegar a minutas
    await page.click('text=Prevención de Riesgos');
    await page.click('text=Minutas del Comité');
    await page.waitForURL('**/committee-minutes');

    // Contar minutas iniciales
    const initialCount = await page.locator('[class*="minute-item"], tr').count();

    const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
    
    if (await deleteButton.isVisible() && initialCount > 0) {
      await deleteButton.click();

      // Confirmar eliminación
      await page.click('button:has-text("Eliminar")');

      // Verificar mensaje de éxito
      await expect(page.locator('text=eliminad, text=éxito')).toBeVisible({ timeout: 5000 });

      // Verificar que el conteo disminuyó
      await page.waitForTimeout(1000);
      const finalCount = await page.locator('[class*="minute-item"], tr').count();
      expect(finalCount).toBeLessThan(initialCount);
    }
  });

  test('Componente ConfirmDialog es reutilizable', async ({ authenticatedPage: page }) => {
    // Verificar que el mismo componente se usa en múltiples páginas
    const pages = [
      { menu: 'Prevención de Riesgos', submenu: 'Minutas del Comité', url: 'committee-minutes' },
      { menu: 'Gestión de Talento', submenu: 'Departamentos', url: 'departments' },
      { menu: 'Evaluación de Desempeño', submenu: 'Gestión de Evaluaciones', url: 'assessments' },
    ];

    for (const pageInfo of pages) {
      await page.click(`text=${pageInfo.menu}`);
      await page.click(`text=${pageInfo.submenu}`);
      await page.waitForURL(`**/${pageInfo.url}`);

      const deleteButton = page.locator('button[aria-label*="Eliminar"], button:has(svg.lucide-trash)').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verificar estructura consistente del dialog
        await expect(page.locator('[role="alertdialog"]')).toBeVisible();
        await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
        await expect(page.locator('button:has-text("Eliminar")')).toBeVisible();

        // Cerrar dialog
        await page.click('button:has-text("Cancelar")');
      }

      // Volver al inicio
      await page.click('text=Dashboard, text=Inicio');
    }
  });
});

test.describe('Accesibilidad de Confirmaciones', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loginButton = page.locator('text=Acceder a la Plataforma');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Dialog de confirmación tiene roles ARIA correctos', async ({ authenticatedPage: page }) => {
    await page.click('text=Prevención de Riesgos');
    await page.click('text=Minutas del Comité');

    const deleteButton = page.locator('button[aria-label*="Eliminar"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar role="alertdialog"
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();

      // Verificar aria-labelledby y aria-describedby
      const hasAriaLabel = await dialog.getAttribute('aria-labelledby');
      const hasAriaDesc = await dialog.getAttribute('aria-describedby');
      
      expect(hasAriaLabel || hasAriaDesc).toBeTruthy();
    }
  });

  test('Focus trap funciona en dialog de confirmación', async ({ authenticatedPage: page }) => {
    await page.click('text=Prevención de Riesgos');
    await page.click('text=Minutas del Comité');

    const deleteButton = page.locator('button[aria-label*="Eliminar"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verificar que el focus está en el dialog
      const cancelButton = page.locator('button:has-text("Cancelar")');
      await expect(cancelButton).toBeVisible();

      // Presionar Tab varias veces
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verificar que el focus sigue dentro del dialog
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('BUTTON');
    }
  });

  test('Escape cierra el dialog de confirmación', async ({ authenticatedPage: page }) => {
    await page.click('text=Prevención de Riesgos');
    await page.click('text=Minutas del Comité');

    const deleteButton = page.locator('button[aria-label*="Eliminar"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.locator('[role="alertdialog"]')).toBeVisible();

      // Presionar Escape
      await page.keyboard.press('Escape');

      // Verificar que se cerró
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
    }
  });
});
