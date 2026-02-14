/**
 * SkipLink - Componente de accesibilidad WCAG 2.1 AA
 * Permite a usuarios de teclado/lectores de pantalla saltar al contenido principal
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      aria-label="Saltar al contenido principal"
    >
      Saltar al contenido principal
    </a>
  );
}
