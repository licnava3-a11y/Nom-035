import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'wouter';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

/**
 * Componente Breadcrumb para navegación jerárquica
 * Muestra la ruta actual y permite navegar a niveles superiores
 */
export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      {showHome && (
        <>
          <Link href="/" className="hover:text-foreground transition-colors flex items-center">
            <Home className="h-4 w-4" />
          </Link>
          {items.length > 0 && <ChevronRight className="h-4 w-4" />}
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <Fragment key={index}>
            {item.href && !isLast ? (
              <Link 
                href={item.href} 
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * BreadcrumbSkeleton - Skeleton loader para breadcrumbs
 */
export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
    </div>
  );
}
