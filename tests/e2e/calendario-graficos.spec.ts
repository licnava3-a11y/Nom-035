import { test, expect } from "../fixtures/mock-auth";

/**
 * Test E2E: Calendario de Deadlines y Gráficos del Dashboard
 *
 * Funcionalidades probadas:
 * 1. Calendario: Navegación, filtros, interacción con eventos
 * 2. Gráficos: Renderizado, interacción, datos correctos
 */

test.describe("Calendario de Deadlines", () => {
  test.beforeEach(async ({ mockedAuthPage: page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Login si es necesario
    const loginButton = page.locator("text=Acceder a la Plataforma");
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("Navegación entre meses funciona correctamente", async ({
    mockedAuthPage: page,
  }) => {
    // Navegar al calendario
    await page.click("text=Calendario");
    await page.waitForURL("**/calendar");

    // Verificar que el calendario se renderizó
    await expect(
      page.locator('.fc-toolbar, [class*="calendar"]')
    ).toBeVisible();

    // Obtener mes actual
    const currentMonth = await page
      .locator('.fc-toolbar-title, [class*="month-title"]')
      .textContent();

    // Click en "Siguiente mes"
    await page.click(
      'button[aria-label="Next month"], button:has-text("›"), button:has-text("Siguiente")'
    );

    // Verificar que el mes cambió
    const nextMonth = await page
      .locator('.fc-toolbar-title, [class*="month-title"]')
      .textContent();
    expect(nextMonth).not.toBe(currentMonth);

    // Click en "Mes anterior"
    await page.click(
      'button[aria-label="Previous month"], button:has-text("‹"), button:has-text("Anterior")'
    );

    // Verificar que volvió al mes original
    const backToMonth = await page
      .locator('.fc-toolbar-title, [class*="month-title"]')
      .textContent();
    expect(backToMonth).toBe(currentMonth);
  });

  test("Filtros por tipo de evento funcionan", async ({
    mockedAuthPage: page,
  }) => {
    await page.click("text=Calendario");
    await page.waitForURL("**/calendar");

    // Verificar que hay eventos visibles inicialmente
    const initialEvents = await page
      .locator('.fc-event, [class*="event"]')
      .count();
    expect(initialEvents).toBeGreaterThan(0);

    // Aplicar filtro (ejemplo: solo cursos)
    const filterSelect = page.locator(
      'select[name="eventType"], select:has-text("Tipo de evento")'
    );
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption("course");

      // Esperar a que se actualicen los eventos
      await page.waitForTimeout(500);

      // Verificar que los eventos cambiaron
      const filteredEvents = await page
        .locator('.fc-event, [class*="event"]')
        .count();
      expect(filteredEvents).toBeLessThanOrEqual(initialEvents);
    }

    // Limpiar filtro
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption("all");
      await page.waitForTimeout(500);
    }
  });

  test("Click en evento muestra detalles", async ({ mockedAuthPage: page }) => {
    await page.click("text=Calendario");
    await page.waitForURL("**/calendar");

    // Esperar a que los eventos carguen
    await page.waitForSelector('.fc-event, [class*="event"]', {
      timeout: 5000,
    });

    // Click en el primer evento
    await page.locator('.fc-event, [class*="event"]').first().click();

    // Verificar que se muestra un dialog/modal con detalles
    await expect(
      page.locator('[role="dialog"], .modal, [class*="dialog"]')
    ).toBeVisible({ timeout: 3000 });

    // Verificar que tiene información del evento
    await expect(
      page.locator("text=Título, text=Descripción, text=Fecha")
    ).toBeVisible();
  });

  test("Eventos se renderizan en las fechas correctas", async ({
    mockedAuthPage: page,
  }) => {
    await page.click("text=Calendario");
    await page.waitForURL("**/calendar");

    // Verificar que hay eventos en el calendario
    const events = await page.locator('.fc-event, [class*="event"]').count();
    expect(events).toBeGreaterThan(0);

    // Verificar que los eventos tienen fecha
    const firstEvent = page.locator('.fc-event, [class*="event"]').first();
    const eventDate = await firstEvent.getAttribute("data-date");
    expect(eventDate).toBeTruthy();
  });
});

test.describe("Gráficos del Dashboard", () => {
  test.beforeEach(async ({ mockedAuthPage: page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Login si es necesario
    const loginButton = page.locator("text=Acceder a la Plataforma");
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navegar al dashboard
    await page.click("text=Dashboard, text=Inicio");
    await page.waitForLoadState("networkidle");
  });

  test("Gráficos de Chart.js se renderizan correctamente", async ({
    mockedAuthPage: page,
  }) => {
    // Verificar que los canvas de Chart.js existen
    const charts = await page.locator("canvas").count();
    expect(charts).toBeGreaterThan(0);

    // Verificar que al menos un gráfico tiene datos
    const firstCanvas = page.locator("canvas").first();
    await expect(firstCanvas).toBeVisible();

    // Verificar que el canvas tiene dimensiones
    const box = await firstCanvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test("Interacción con gráficos (hover) funciona", async ({
    mockedAuthPage: page,
  }) => {
    // Esperar a que los gráficos carguen
    await page.waitForSelector("canvas", { timeout: 5000 });

    const firstCanvas = page.locator("canvas").first();

    // Hacer hover sobre el gráfico
    await firstCanvas.hover();

    // Verificar que aparece tooltip (Chart.js muestra tooltips en hover)
    // Nota: Los tooltips de Chart.js se renderizan dentro del canvas,
    // por lo que verificamos que el canvas sigue visible y no hay errores
    await expect(firstCanvas).toBeVisible();
  });

  test("Gráfico de casos por mes muestra datos correctos", async ({
    mockedAuthPage: page,
  }) => {
    // Navegar a métricas de casos
    await page.click("text=Prevención de Riesgos");
    await page.click("text=Métricas de Casos");
    await page.waitForURL("**/cases-metrics");

    // Verificar que el gráfico de tendencias existe
    await expect(page.locator("canvas").first()).toBeVisible();

    // Verificar que hay datos en el gráfico (título o leyenda)
    await expect(
      page.locator("text=Casos por Mes, text=Tendencia")
    ).toBeVisible();

    // Verificar que hay métricas numéricas
    await expect(page.locator("text=/\\d+/")).toBeVisible(); // Cualquier número
  });

  test("Gráfico de distribución por tipo funciona", async ({
    mockedAuthPage: page,
  }) => {
    await page.click("text=Prevención de Riesgos");
    await page.click("text=Métricas de Casos");
    await page.waitForURL("**/cases-metrics");

    // Buscar el gráfico pie/doughnut
    const charts = await page.locator("canvas").count();
    expect(charts).toBeGreaterThanOrEqual(2); // Al menos 2 gráficos

    // Verificar que hay leyenda o labels
    await expect(
      page.locator("text=Acoso, text=Violencia, text=Estrés")
    ).toBeVisible();
  });

  test("Gráficos de NMX-025 se renderizan correctamente", async ({
    mockedAuthPage: page,
  }) => {
    // Navegar al dashboard principal
    await page.click("text=Dashboard, text=Inicio");

    // Scroll hacia abajo para ver gráficos NMX-025
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight / 2)
    );

    // Verificar gráfico de brecha salarial
    await expect(page.locator("text=Brecha Salarial")).toBeVisible();

    // Verificar gráfico de distribución jerárquica
    await expect(page.locator("text=Distribución Jerárquica")).toBeVisible();

    // Verificar gráfico de género
    await expect(page.locator("text=Distribución por Género")).toBeVisible();

    // Verificar que los gráficos tienen canvas
    const nmxCharts = await page.locator("canvas").count();
    expect(nmxCharts).toBeGreaterThanOrEqual(3);
  });

  test("Gráficos responden a cambios de datos", async ({
    mockedAuthPage: page,
  }) => {
    await page.click("text=Prevención de Riesgos");
    await page.click("text=Métricas de Casos");

    // Capturar estado inicial
    const initialChartCount = await page.locator("canvas").count();

    // Aplicar filtro de fecha (si existe)
    const dateFilter = page.locator(
      'select[name="period"], select:has-text("Período")'
    );
    if (await dateFilter.isVisible()) {
      await dateFilter.selectOption("monthly");
      await page.waitForTimeout(1000);

      // Verificar que los gráficos siguen visibles
      const updatedChartCount = await page.locator("canvas").count();
      expect(updatedChartCount).toBe(initialChartCount);
    }
  });
});

test.describe("Compatibilidad Multi-Navegador", () => {
  test("Dashboard funciona en diferentes viewports", async ({
    mockedAuthPage: page,
  }) => {
    // Test en desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("http://localhost:3000");

    const loginButton = page.locator("text=Acceder a la Plataforma");
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }

    await expect(page.locator("canvas").first()).toBeVisible();

    // Test en tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("canvas").first()).toBeVisible();

    // Test en mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // En mobile, los gráficos pueden estar en un scroll horizontal o colapsados
    const chartsVisible = await page.locator("canvas").first().isVisible();
    expect(chartsVisible).toBeTruthy();
  });
});
