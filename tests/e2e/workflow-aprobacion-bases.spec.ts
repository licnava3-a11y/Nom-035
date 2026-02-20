import { test, expect } from '../fixtures/auth';

/**
 * Test E2E: Workflow de Aprobación de Bases de Funcionamiento del Comité
 * 
 * Flujo completo:
 * 1. Login como usuario autorizado
 * 2. Crear nueva base de funcionamiento
 * 3. Completar formulario con validación
 * 4. Enviar a revisión
 * 5. Aprobar base (como miembro del comité)
 * 6. Verificar notificaciones
 */

test.describe('Workflow de Aprobación de Bases de Funcionamiento', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navegar a la página de login
    await page.goto('http://localhost:3000');
    
    // Esperar a que la página cargue
    await page.waitForLoadState('networkidle');
  });

  test('Crear y aprobar base de funcionamiento completa', async ({ authenticatedPage: page }) => {
    // 1. Login (asumiendo que hay un botón de acceso)
    const loginButton = page.locator('text=Acceder a la Plataforma');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }

    // 2. Navegar a Bases de Funcionamiento
    await page.click('text=Prevención de Riesgos');
    await page.click('text=Bases de Funcionamiento');
    await page.waitForURL('**/committee-operating-rules');

    // 3. Verificar que la página cargó correctamente
    await expect(page.locator('h1, h2').filter({ hasText: 'Bases de Funcionamiento' })).toBeVisible();

    // 4. Click en "Nueva Base"
    await page.click('button:has-text("Nueva Base")');
    
    // 5. Esperar a que el formulario aparezca
    await expect(page.locator('text=Crear Nueva Base de Funcionamiento')).toBeVisible();

    // 6. Completar formulario con validación en tiempo real
    const objectivesField = page.locator('textarea[name="objectives"]');
    await objectivesField.fill('Objetivo de prueba corto'); // Menos de 50 caracteres
    
    // Verificar que aparece error de validación
    await expect(page.locator('text=debe tener al menos 50 caracteres')).toBeVisible({ timeout: 1000 });
    
    // Completar con texto válido
    await objectivesField.fill('Establecer los lineamientos y procedimientos para el funcionamiento efectivo del comité de prevención de riesgos psicosociales, garantizando el cumplimiento de la NOM-035-STPS-2018 y promoviendo un entorno laboral saludable.');
    
    // Verificar que el error desaparece
    await expect(page.locator('text=debe tener al menos 50 caracteres')).not.toBeVisible({ timeout: 1000 });

    // Completar estructura
    await page.locator('textarea[name="structure"]').fill('El comité estará conformado por representantes de la empresa y de los trabajadores, con un mínimo de 3 integrantes y un máximo de 10, designados de acuerdo con los criterios establecidos en la normativa vigente.');

    // Completar roles y responsabilidades
    await page.locator('textarea[name="roles"]').fill('Coordinador: Dirigir las sesiones y dar seguimiento a acuerdos. Secretario: Elaborar minutas y mantener archivo. Vocales: Participar en investigaciones y proponer medidas preventivas.');

    // Completar quórum
    await page.locator('textarea[name="quorum"]').fill('Se requiere la presencia de al menos el 50% más uno de los integrantes del comité para sesionar válidamente. Las decisiones se tomarán por mayoría simple de los presentes.');

    // Completar manejo de casos
    await page.locator('textarea[name="caseHandling"]').fill('Los casos se recibirán de forma confidencial, se investigarán en un plazo máximo de 30 días hábiles, y se emitirán recomendaciones para su atención y seguimiento.');

    // Completar confidencialidad
    await page.locator('textarea[name="confidentiality"]').fill('Todos los integrantes del comité firmarán un compromiso de confidencialidad. La información de los casos se manejará con estricta reserva y solo será compartida con personal autorizado.');

    // 7. Verificar indicador de guardado automático
    await expect(page.locator('text=Guardando..., text=Guardado')).toBeVisible({ timeout: 35000 });

    // 8. Guardar base de funcionamiento
    await page.click('button:has-text("Guardar")');
    
    // 9. Verificar mensaje de éxito
    await expect(page.locator('text=Base de funcionamiento creada exitosamente')).toBeVisible({ timeout: 5000 });

    // 10. Verificar que aparece en la lista
    await expect(page.locator('text=Establecer los lineamientos')).toBeVisible();

    // 11. Enviar a revisión
    await page.click('button[aria-label="Enviar a revisión"]').first();
    
    // 12. Confirmar envío
    await page.click('button:has-text("Confirmar")');
    
    // 13. Verificar cambio de estado
    await expect(page.locator('text=En Revisión')).toBeVisible({ timeout: 5000 });

    // 14. Aprobar base (como miembro del comité)
    await page.click('button[aria-label="Aprobar"]').first();
    
    // 15. Confirmar aprobación
    await page.click('button:has-text("Aprobar")');
    
    // 16. Verificar estado aprobado
    await expect(page.locator('text=Aprobada')).toBeVisible({ timeout: 5000 });

    // 17. Verificar notificación
    // (Nota: Las notificaciones pueden aparecer como toast o en un panel)
    await expect(page.locator('text=Base de funcionamiento aprobada')).toBeVisible({ timeout: 3000 });
  });

  test('Validación en tiempo real funciona correctamente', async ({ authenticatedPage: page }) => {
    // Login y navegación
    const loginButton = page.locator('text=Acceder a la Plataforma');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }

    await page.click('text=Prevención de Riesgos');
    await page.click('text=Bases de Funcionamiento');
    await page.click('button:has-text("Nueva Base")');

    // Test de validación de longitud mínima
    const objectivesField = page.locator('textarea[name="objectives"]');
    await objectivesField.fill('Texto corto');
    
    // Esperar debounce (300ms)
    await page.waitForTimeout(500);
    
    // Verificar error
    await expect(page.locator('text=debe tener al menos 50 caracteres')).toBeVisible();
    
    // Verificar border rojo
    await expect(objectivesField).toHaveClass(/border-red/);

    // Corregir texto
    await objectivesField.fill('Este es un texto suficientemente largo para cumplir con la validación mínima de cincuenta caracteres requeridos por el sistema.');
    
    await page.waitForTimeout(500);
    
    // Verificar que error desaparece
    await expect(page.locator('text=debe tener al menos 50 caracteres')).not.toBeVisible();
    
    // Verificar que border rojo desaparece
    await expect(objectivesField).not.toHaveClass(/border-red/);
  });

  test('Confirmación de salida con cambios sin guardar', async ({ authenticatedPage: page }) => {
    // Login y navegación
    const loginButton = page.locator('text=Acceder a la Plataforma');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }

    await page.click('text=Prevención de Riesgos');
    await page.click('text=Bases de Funcionamiento');
    await page.click('button:has-text("Nueva Base")');

    // Hacer cambios
    await page.locator('textarea[name="objectives"]').fill('Este es un cambio sin guardar que debería activar la confirmación de salida del formulario.');

    // Intentar cancelar
    await page.click('button:has-text("Cancelar")');

    // Verificar confirmación
    await expect(page.locator('text=¿Descartar cambios?')).toBeVisible();

    // Cancelar la salida
    await page.click('button:has-text("Continuar editando")');

    // Verificar que seguimos en el formulario
    await expect(page.locator('textarea[name="objectives"]')).toBeVisible();
  });

  test('Recuperación de borradores al volver', async ({ authenticatedPage: page }) => {
    // Login y navegación
    const loginButton = page.locator('text=Acceder a la Plataforma');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }

    await page.click('text=Prevención de Riesgos');
    await page.click('text=Bases de Funcionamiento');
    await page.click('button:has-text("Nueva Base")');

    const testText = 'Este es un borrador que debería recuperarse automáticamente cuando vuelva a abrir el formulario de creación.';
    
    // Escribir texto
    await page.locator('textarea[name="objectives"]').fill(testText);

    // Esperar guardado automático
    await page.waitForTimeout(31000); // 30 segundos + margen

    // Cancelar sin confirmar (forzar salida)
    await page.evaluate(() => {
      window.onbeforeunload = null; // Desactivar confirmación
    });
    
    await page.click('button:has-text("Cancelar")');

    // Volver a abrir formulario
    await page.click('button:has-text("Nueva Base")');

    // Verificar que el texto se recuperó
    await expect(page.locator('textarea[name="objectives"]')).toHaveValue(testText);

    // Verificar mensaje de recuperación
    await expect(page.locator('text=Borrador recuperado')).toBeVisible();
  });
});
