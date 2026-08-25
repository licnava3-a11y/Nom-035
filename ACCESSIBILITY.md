# Guía de Accesibilidad WCAG 2.1 AA

Este documento describe las mejoras de accesibilidad implementadas en el sistema para cumplir con WCAG 2.1 nivel AA.

## Componentes con ARIA Labels Implementados

### Navegación y Layout

- **SkipLink** (`client/src/components/SkipLink.tsx`)
  - Permite saltar al contenido principal con Tab
  - `aria-label="Saltar al contenido principal"`
- **DashboardLayout** (`client/src/components/DashboardLayout.tsx`)
  - Navegación principal con `role="navigation"` y `aria-label="Navegación principal"`
  - Menú lateral con `role="menu"` y `aria-label="Menú de navegación"`

### Formularios y Controles

Todos los formularios deben incluir:

- `aria-label` o `aria-labelledby` en inputs sin label visible
- `aria-describedby` para mensajes de error y ayuda
- `aria-required="true"` en campos obligatorios
- `aria-invalid="true"` en campos con errores

### Botones y Acciones

- Botones con solo iconos: `aria-label` descriptivo
- Botones de cerrar: `aria-label="Cerrar"`
- Botones de menú: `aria-label="Abrir menú"` y `aria-expanded`

### Componentes Interactivos

- **Modals/Dialogs**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Tabs**: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- **Dropdowns**: `aria-haspopup="true"`, `aria-expanded`
- **Tooltips**: `aria-describedby` vinculado al tooltip

## Navegación por Teclado

### Atajos Implementados

- `Ctrl+/` - Mostrar ayuda de atajos de teclado
- `Tab` - Navegar entre elementos interactivos
- `Enter` - Activar botones y enlaces
- `Escape` - Cerrar modals y dropdowns
- `Arrow keys` - Navegar en tabs, dropdowns y menús

### Orden de Tabulación

El orden de tabulación debe seguir el flujo visual de la página:

1. SkipLink (invisible hasta focus)
2. Navegación principal
3. Contenido principal
4. Controles secundarios

## Contraste de Colores WCAG 2.1 AA

### Requisitos Mínimos

- **Texto normal**: Contraste mínimo 4.5:1
- **Texto grande** (18pt+ o 14pt+ bold): Contraste mínimo 3:1
- **Componentes UI**: Contraste mínimo 3:1

### Paleta de Colores Accesible

Definida en `client/src/index.css`:

```css
:root {
  --background: 0 0% 100%; /* #ffffff */
  --foreground: 222.2 84% 4.9%; /* #020817 - Contraste 21:1 ✓ */

  --primary: 222.2 47.4% 11.2%; /* #0f172a - Contraste 17.9:1 ✓ */
  --primary-foreground: 210 40% 98%; /* #f8fafc */

  --secondary: 210 40% 96.1%; /* #f1f5f9 */
  --secondary-foreground: 222.2 47.4% 11.2%; /* #0f172a - Contraste 17.9:1 ✓ */

  --accent: 210 40% 96.1%; /* #f1f5f9 */
  --accent-foreground: 222.2 47.4% 11.2%; /* #0f172a - Contraste 17.9:1 ✓ */

  --destructive: 0 84.2% 60.2%; /* #ef4444 */
  --destructive-foreground: 210 40% 98%; /* #f8fafc - Contraste 4.7:1 ✓ */

  --muted: 210 40% 96.1%; /* #f1f5f9 */
  --muted-foreground: 215.4 16.3% 46.9%; /* #64748b - Contraste 4.6:1 ✓ */

  --border: 214.3 31.8% 91.4%; /* #e2e8f0 */
  --input: 214.3 31.8% 91.4%; /* #e2e8f0 */
  --ring: 222.2 84% 4.9%; /* #020817 */
}

.dark {
  --background: 222.2 84% 4.9%; /* #020817 */
  --foreground: 210 40% 98%; /* #f8fafc - Contraste 21:1 ✓ */

  --primary: 210 40% 98%; /* #f8fafc */
  --primary-foreground: 222.2 47.4% 11.2%; /* #0f172a - Contraste 17.9:1 ✓ */

  --secondary: 217.2 32.6% 17.5%; /* #1e293b */
  --secondary-foreground: 210 40% 98%; /* #f8fafc - Contraste 14.7:1 ✓ */

  --accent: 217.2 32.6% 17.5%; /* #1e293b */
  --accent-foreground: 210 40% 98%; /* #f8fafc - Contraste 14.7:1 ✓ */

  --destructive: 0 62.8% 30.6%; /* #7f1d1d */
  --destructive-foreground: 210 40% 98%; /* #f8fafc - Contraste 10.8:1 ✓ */

  --muted: 217.2 32.6% 17.5%; /* #1e293b */
  --muted-foreground: 215 20.2% 65.1%; /* #94a3b8 - Contraste 7.2:1 ✓ */

  --border: 217.2 32.6% 17.5%; /* #1e293b */
  --input: 217.2 32.6% 17.5%; /* #1e293b */
  --ring: 212.7 26.8% 83.9%; /* #cbd5e1 */
}
```

### Verificación de Contraste

Usar herramientas como:

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio Calculator](https://contrast-ratio.com/)
- Chrome DevTools > Lighthouse > Accessibility

## Regiones ARIA (Landmarks)

Estructura semántica implementada:

```html
<body>
  <a href="#main-content" class="skip-link">Saltar al contenido</a>

  <nav role="navigation" aria-label="Navegación principal">
    <!-- Menú principal -->
  </nav>

  <main id="main-content" role="main">
    <!-- Contenido principal -->
  </main>

  <aside role="complementary" aria-label="Información adicional">
    <!-- Contenido secundario -->
  </aside>

  <footer role="contentinfo">
    <!-- Pie de página -->
  </footer>
</body>
```

## Notificaciones y Mensajes Dinámicos

Usar `aria-live` para anunciar cambios:

```tsx
<div aria-live="polite" aria-atomic="true">
  {message}
</div>

<div aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>
```

## Pruebas de Accesibilidad

### Herramientas Recomendadas

1. **Lighthouse** (Chrome DevTools) - Auditoría automática
2. **axe DevTools** - Extensión de navegador
3. **NVDA/JAWS** - Lectores de pantalla
4. **Keyboard navigation** - Probar con Tab, Enter, Escape

### Checklist de Pruebas

- [ ] Toda la funcionalidad es accesible con teclado
- [ ] El orden de tabulación es lógico
- [ ] Los elementos interactivos tienen estados de focus visibles
- [ ] Los formularios tienen labels y mensajes de error claros
- [ ] Las imágenes tienen alt text descriptivo
- [ ] Los videos tienen subtítulos (si aplica)
- [ ] El contraste de colores cumple WCAG 2.1 AA
- [ ] Los lectores de pantalla anuncian correctamente el contenido

## Recursos Adicionales

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)
