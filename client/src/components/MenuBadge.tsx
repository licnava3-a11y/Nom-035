/**
 * MenuBadge Component
 * Badge reutilizable para mostrar contadores e indicadores en el menú lateral
 */

interface MenuBadgeProps {
  count: number;
  variant?: "danger" | "warning" | "info" | "success";
  maxCount?: number;
}

export function MenuBadge({
  count,
  variant = "danger",
  maxCount = 99,
}: MenuBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const variantStyles = {
    danger: "bg-red-600 text-white",
    warning: "bg-yellow-500 text-gray-900",
    info: "bg-blue-600 text-white",
    success: "bg-green-600 text-white",
  };

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full ${variantStyles[variant]}`}
    >
      {displayCount}
    </span>
  );
}
