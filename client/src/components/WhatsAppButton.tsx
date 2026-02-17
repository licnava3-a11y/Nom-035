import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { openWhatsAppDemo, DemoRequestData, NORMATIVAS_MAP } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
  phoneNumber: string; // Número de WhatsApp del negocio (formato: 525512345678)
  userData?: DemoRequestData; // Datos del usuario para pre-llenar mensaje
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Componente de botón de WhatsApp reutilizable
 * Abre WhatsApp con mensaje pre-llenado para solicitar demo
 */
export function WhatsAppButton({
  phoneNumber,
  userData,
  variant = "default",
  size = "default",
  className = "",
  children,
}: WhatsAppButtonProps) {
  const handleClick = () => {
    if (userData) {
      openWhatsAppDemo(phoneNumber, userData);
    } else {
      // Si no hay datos del usuario, abrir WhatsApp sin mensaje pre-llenado
      window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}`, "_blank");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
      onClick={handleClick}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      {children || "Solicitar por WhatsApp"}
    </Button>
  );
}

interface WhatsAppDemoButtonProps {
  phoneNumber: string;
  nombre?: string;
  email?: string;
  empresa?: string;
  normativasSeleccionadas?: string[]; // Códigos de normativas seleccionadas
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * Botón especializado para solicitar demo por WhatsApp
 * Incluye validación de datos y mapeo de normativas
 */
export function WhatsAppDemoButton({
  phoneNumber,
  nombre,
  email,
  empresa,
  normativasSeleccionadas = [],
  variant = "default",
  size = "default",
  className = "",
}: WhatsAppDemoButtonProps) {
  // Mapear códigos de normativas a nombres completos
  const normativasNombres = normativasSeleccionadas
    .map((codigo) => NORMATIVAS_MAP[codigo] || codigo)
    .filter(Boolean);

  const userData: DemoRequestData = {
    nombre,
    email,
    empresa,
    normativas: normativasNombres,
  };

  return (
    <WhatsAppButton
      phoneNumber={phoneNumber}
      userData={userData}
      variant={variant}
      size={size}
      className={className}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Solicitar Demo por WhatsApp
    </WhatsAppButton>
  );
}
