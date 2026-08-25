import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileImage, FileType } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface HeatmapExportProps {
  /**
   * ID del elemento DOM que contiene el heatmap/matriz a exportar
   */
  targetElementId: string;

  /**
   * Nombre base del archivo (sin extensión)
   */
  filename?: string;

  /**
   * Nombre de la empresa para marca de agua
   */
  companyName?: string;
}

/**
 * Componente reutilizable para exportar heatmaps/matrices a PNG o SVG
 *
 * @example
 * ```tsx
 * <HeatmapExport
 *   targetElementId="skills-matrix-table"
 *   filename="matriz_habilidades"
 *   companyName="Mi Empresa S.A."
 * />
 * ```
 */
export function HeatmapExport({
  targetElementId,
  filename = "heatmap_export",
  companyName,
}: HeatmapExportProps) {
  /**
   * Exporta el elemento como PNG usando html2canvas
   */
  const exportToPNG = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("Error", {
        description: "No se encontró el elemento a exportar",
      });
      return;
    }

    try {
      toast.info("Generando imagen...", { description: "Por favor espera" });

      // Capturar el elemento como canvas con alta calidad
      const canvas = await html2canvas(element, {
        scale: 2, // 2x resolution para mejor calidad
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Agregar marca de agua si se proporciona nombre de empresa
      if (companyName) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const now = new Date();
          const dateStr = now.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Configurar marca de agua
          ctx.font = "14px Arial";
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.textAlign = "right";

          // Agregar fecha y empresa en la esquina inferior derecha
          const padding = 20;
          ctx.fillText(
            companyName,
            canvas.width - padding,
            canvas.height - padding - 20
          );
          ctx.fillText(
            dateStr,
            canvas.width - padding,
            canvas.height - padding
          );
        }
      }

      // Convertir canvas a blob y descargar
      canvas.toBlob(blob => {
        if (!blob) {
          toast.error("Error", { description: "No se pudo generar la imagen" });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success("Imagen exportada", {
          description: "El archivo PNG se descargó correctamente",
        });
      }, "image/png");
    } catch (error) {
      console.error("Error al exportar PNG:", error);
      toast.error("Error", { description: "No se pudo exportar la imagen" });
    }
  };

  /**
   * Exporta el elemento como SVG
   * Nota: Esta es una implementación simplificada que convierte el HTML a SVG
   */
  const exportToSVG = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("Error", {
        description: "No se encontró el elemento a exportar",
      });
      return;
    }

    try {
      toast.info("Generando SVG...", { description: "Por favor espera" });

      // Primero capturar como canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convertir canvas a data URL
      const dataURL = canvas.toDataURL("image/png");

      // Crear SVG con la imagen embebida
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image xlink:href="${dataURL}" width="${canvas.width}" height="${canvas.height}"/>
  ${
    companyName
      ? `
  <text x="${canvas.width - 20}" y="${canvas.height - 40}" 
        font-family="Arial" font-size="14" fill="rgba(0,0,0,0.3)" text-anchor="end">
    ${companyName}
  </text>
  <text x="${canvas.width - 20}" y="${canvas.height - 20}" 
        font-family="Arial" font-size="14" fill="rgba(0,0,0,0.3)" text-anchor="end">
    ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
  </text>
  `
      : ""
  }
</svg>`;

      // Descargar SVG
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("SVG exportado", {
        description: "El archivo SVG se descargó correctamente",
      });
    } catch (error) {
      console.error("Error al exportar SVG:", error);
      toast.error("Error", { description: "No se pudo exportar el SVG" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar Imagen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPNG}>
          <FileImage className="h-4 w-4 mr-2" />
          Exportar como PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToSVG}>
          <FileType className="h-4 w-4 mr-2" />
          Exportar como SVG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
