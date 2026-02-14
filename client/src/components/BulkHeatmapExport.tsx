import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import JSZip from "jszip";

interface BulkHeatmapExportProps {
  companyName?: string;
}

export function BulkHeatmapExport({ companyName = "Empresa" }: BulkHeatmapExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const { data: departments } = trpc.skillsMatrix.getActiveDepartments.useQuery();

  const generateHeatmapForDepartment = async (
    departmentId: number,
    departmentName: string,
    matrixData: any
  ): Promise<Blob | null> => {
    try {
      // Create a temporary container for the heatmap
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "1200px";
      container.style.backgroundColor = "white";
      container.style.padding = "40px";
      document.body.appendChild(container);

      // Build HTML for the heatmap
      const { employees, competencies, matrix } = matrixData;

      if (employees.length === 0 || competencies.length === 0) {
        document.body.removeChild(container);
        return null;
      }

      // Create table HTML
      let tableHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1 style="font-size: 24px; margin-bottom: 8px; color: #1e293b;">${departmentName}</h1>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">Matriz de Habilidades - ${companyName}</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #1e40af; color: white;">
                <th style="border: 1px solid #cbd5e1; padding: 12px; text-align: left;">Empleado</th>
      `;

      competencies.forEach((comp: any) => {
        tableHTML += `<th style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; writing-mode: vertical-rl; transform: rotate(180deg); max-width: 40px;">${comp.name}</th>`;
      });

      tableHTML += `</tr></thead><tbody>`;

      employees.forEach((emp: any, empIndex: number) => {
        const bgColor = empIndex % 2 === 0 ? "#f8fafc" : "#ffffff";
        tableHTML += `<tr style="background-color: ${bgColor};">`;
        tableHTML += `<td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: 500;">${emp.name}</td>`;

        competencies.forEach((comp: any) => {
          const skillData = matrix.find(
            (m: any) => m.employeeId === emp.id && m.competencyId === comp.id
          );
          const level = skillData?.level || "Sin evaluar";

          let cellColor = "#f1f5f9"; // Sin evaluar
          if (level === "Básico") cellColor = "#fef3c7";
          else if (level === "Intermedio") cellColor = "#bfdbfe";
          else if (level === "Avanzado") cellColor = "#bbf7d0";
          else if (level === "Experto") cellColor = "#86efac";

          tableHTML += `<td style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; background-color: ${cellColor}; font-size: 10px;">${level}</td>`;
        });

        tableHTML += `</tr>`;
      });

      tableHTML += `</tbody></table>`;
      tableHTML += `<p style="margin-top: 20px; font-size: 10px; color: #94a3b8;">Generado el ${new Date().toLocaleDateString("es-MX")} - ${companyName}</p>`;
      tableHTML += `</div>`;

      container.innerHTML = tableHTML;

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      });
    } catch (error) {
      console.error(`Error generating heatmap for ${departmentName}:`, error);
      return null;
    }
  };

  const handleBulkExport = async () => {
    if (!departments || departments.length === 0) {
      toast.error("No hay departamentos activos para exportar");
      return;
    }

    setIsExporting(true);
    setProgress({ current: 0, total: departments.length });

    try {
      const zip = new JSZip();
      const folder = zip.folder("matrices_habilidades");

      if (!folder) {
        throw new Error("Error al crear carpeta ZIP");
      }

      // Generate README
      const readme = `Matrices de Habilidades - ${companyName}
Fecha de generación: ${new Date().toLocaleString("es-MX")}

Este archivo contiene las matrices de habilidades de todos los departamentos activos.

Departamentos incluidos:
${departments.map((d) => `- ${d.name}`).join("\n")}

Total de departamentos: ${departments.length}
`;

      folder.file("README.txt", readme);

      // Generate heatmap for each department
      for (let i = 0; i < departments.length; i++) {
        const dept = departments[i];
        setProgress({ current: i + 1, total: departments.length });

        try {
          // Fetch matrix data for this department
          const response = await fetch(`/api/trpc/skillsMatrix.getMatrixByDepartment?input=${encodeURIComponent(JSON.stringify({ departmentId: dept.id }))}`);          
          if (!response.ok) {
            console.error(`Failed to fetch data for ${dept.name}`);
            continue;
          }
          const result = await response.json();
          const matrixData = result.result.data;

          if (matrixData.employees.length === 0) {
            console.log(`Skipping ${dept.name} - no employees`);
            continue;
          }

          // Generate PNG
          const blob = await generateHeatmapForDepartment(dept.id, dept.name, matrixData);

          if (blob) {
            const sanitizedName = dept.name.replace(/[^a-zA-Z0-9_-]/g, "_");
            folder.file(`${sanitizedName}.png`, blob);
          }
        } catch (error) {
          console.error(`Error processing ${dept.name}:`, error);
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `matrices_habilidades_${new Date().toISOString().split("T")[0]}.zip`;
      link.click();

      toast.success(`Exportación completada: ${departments.length} departamentos`);
    } catch (error) {
      console.error("Error during bulk export:", error);
      toast.error("Error al exportar matrices masivamente");
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleBulkExport} disabled={isExporting || !departments || departments.length === 0}>
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exportando {progress.current}/{progress.total}...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Exportar Todas las Matrices (ZIP)
          </>
        )}
      </Button>
      {!departments || departments.length === 0 ? (
        <span className="text-sm text-muted-foreground">No hay departamentos activos</span>
      ) : null}
    </div>
  );
}
