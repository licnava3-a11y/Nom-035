/**
 * nom035MatrixPdfGenerator.ts
 * Generador de PDF para el reporte de la Matriz de Acciones NOM-035.
 * Incluye: portada, tabla de acciones, miniaturas de evidencias y campos de firma.
 */

interface ActionWithEvidences {
  id: number;
  accionId: string;
  tipoPlan: string;
  nivelAplicacion: string;
  objetivo: string;
  accion: string;
  descripcionCompleta?: string | null;
  indicador?: string | null;
  responsable?: string | null;
  plazo?: Date | string | null;
  estado: string;
  prioridad: string;
  observaciones?: string | null;
  evidencias: Array<{
    id: number;
    nombreArchivo: string;
    tipoEvidencia: string;
    descripcion?: string | null;
    fechaSubida: Date | string;
    fileUrl: string;
    tipoArchivo: string;
  }>;
}

interface PlanInfo {
  identificadorNivel: string;
  tipoPlan: string;
  nivelAplicacion: string;
  centroTrabajo?: string | null;
  giroEmpresa?: string | null;
  totalTrabajadores?: number | null;
  filtroAplicado?: string | null;
  firmaNombreResponsable?: string | null;
  firmaCargoResponsable?: string | null;
  firmaNombreRepLegal?: string | null;
  firmaCargoRepLegal?: string | null;
  firmaFecha?: Date | string | null;
  createdAt: Date | string;
}

const ESTADO_LABELS: Record<string, string> = {
  no_iniciada: "No iniciada",
  en_proceso: "En proceso",
  cumplida: "Cumplida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const TIPO_PLAN_LABELS: Record<string, string> = {
  intervencion: "Plan de Intervención de Riesgos Psicosociales",
  violencia_laboral: "Programa de Prevención de Violencia Laboral",
  no_discriminacion: "Programa de Prevención de No Discriminación",
  consolidado: "Plan Consolidado NOM-035",
};

const NIVEL_LABELS: Record<string, string> = {
  organizacional: "Organizacional",
  grupal: "Grupal",
  individual: "Individual",
};

const TIPO_EVIDENCIA_LABELS: Record<string, string> = {
  acta_capacitacion: "Acta de Capacitación",
  registro_fotografico: "Registro Fotográfico",
  correo_electronico: "Correo Electrónico",
  lista_asistencia: "Lista de Asistencia",
  comunicado_interno: "Comunicado Interno",
  captura_pantalla: "Captura de Pantalla",
  acta_reunion: "Acta de Reunión",
  contrato_servicio: "Contrato de Servicio",
  politica_firmada: "Política Firmada",
  otro: "Otro",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Sin fecha";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.substring(0, maxLen - 3) + "..." : text;
}

/**
 * Descarga una imagen desde una URL y retorna un Buffer.
 * Solo para imágenes (jpg, png, webp, gif).
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Genera el PDF completo del reporte de la Matriz de Acciones NOM-035.
 * Retorna el PDF como Buffer.
 */
export async function generateNom035MatrixPdf(
  plan: PlanInfo,
  actions: ActionWithEvidences[],
  options: {
    includeEvidenceThumbnails?: boolean;
    includeAuditLog?: boolean;
    folio?: string;
  } = {}
): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");

  const folio = options.folio || `NOM035-MATRIX-${Date.now()}`;
  const now = new Date();

  // Colores corporativos
  const COLOR_PRIMARY = "#1e3a5f"; // Azul oscuro
  const COLOR_ACCENT = "#2563eb"; // Azul
  const COLOR_SUCCESS = "#16a34a"; // Verde
  const COLOR_WARNING = "#d97706"; // Amarillo
  const COLOR_DANGER = "#dc2626"; // Rojo
  const COLOR_GRAY = "#6b7280"; // Gris
  const COLOR_LIGHT = "#f3f4f6"; // Fondo claro

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Matriz de Acciones NOM-035 — ${plan.identificadorNivel}`,
      Author: "Sistema NOM-035 STPS",
      Subject: "Reporte de Seguimiento de Acciones y Evidencias",
      Keywords: "NOM-035, STPS, acciones, evidencias, intervención",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // margen 50 cada lado

    // ── PORTADA ──────────────────────────────────────────────────────────────

    // Fondo de portada
    doc.rect(0, 0, doc.page.width, 200).fill(COLOR_PRIMARY);

    doc
      .fillColor("white")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("SECRETARÍA DEL TRABAJO Y PREVISIÓN SOCIAL", 50, 60, {
        width: pageWidth,
        align: "center",
      });

    doc.fontSize(16).text("NOM-035-STPS-2018", { align: "center" });

    doc
      .moveDown(0.5)
      .fontSize(14)
      .text("Factores de Riesgo Psicosocial en el Trabajo", {
        align: "center",
      });

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("REPORTE DE SEGUIMIENTO", 50, 220, {
        width: pageWidth,
        align: "center",
      });

    doc
      .fontSize(18)
      .text("Matriz de Acciones y Evidencias", { align: "center" });

    doc.moveDown(1.5);

    // Recuadro de datos del plan
    const boxY = doc.y;
    doc.rect(50, boxY, pageWidth, 160).fillAndStroke(COLOR_LIGHT, "#d1d5db");

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("DATOS DEL PLAN", 65, boxY + 12);

    const col1X = 65;
    const col2X = 50 + pageWidth / 2 + 10;
    let rowY = boxY + 30;

    const dataRows = [
      ["Empresa / Área:", plan.identificadorNivel],
      ["Tipo de programa:", TIPO_PLAN_LABELS[plan.tipoPlan] || plan.tipoPlan],
      [
        "Nivel de aplicación:",
        NIVEL_LABELS[plan.nivelAplicacion] || plan.nivelAplicacion,
      ],
      ["Centro de trabajo:", plan.centroTrabajo || "—"],
    ];
    const dataRows2 = [
      ["Giro de empresa:", plan.giroEmpresa || "—"],
      ["Total trabajadores:", plan.totalTrabajadores?.toString() || "—"],
      ["Filtro aplicado:", plan.filtroAplicado || "—"],
      ["Fecha de generación:", formatDate(now)],
    ];

    doc.fontSize(9).font("Helvetica");
    for (let i = 0; i < dataRows.length; i++) {
      doc
        .fillColor(COLOR_GRAY)
        .text(dataRows[i][0], col1X, rowY, { width: 100, continued: false });
      doc.fillColor("#111827").text(dataRows[i][1], col1X + 105, rowY, {
        width: pageWidth / 2 - 120,
      });
      doc
        .fillColor(COLOR_GRAY)
        .text(dataRows2[i][0], col2X, rowY, { width: 100, continued: false });
      doc.fillColor("#111827").text(dataRows2[i][1], col2X + 105, rowY, {
        width: pageWidth / 2 - 120,
      });
      rowY += 18;
    }

    doc.moveDown(2);

    // Folio
    doc
      .fillColor(COLOR_GRAY)
      .fontSize(9)
      .text(`Folio: ${folio}`, { align: "center" });

    doc.text(
      `Generado el ${formatDate(now)} a las ${now.toLocaleTimeString("es-MX")}`,
      { align: "center" }
    );

    // ── ÍNDICE ────────────────────────────────────────────────────────────────

    doc.addPage();
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("ÍNDICE DE CONTENIDO", { align: "center" });

    doc.moveDown();
    doc
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(50 + pageWidth, doc.y)
      .stroke();
    doc.moveDown(0.5);

    const indexItems = [
      "1. Resumen ejecutivo de cumplimiento",
      "2. Matriz de acciones por tipo de programa",
      "3. Detalle de acciones y evidencias",
      "4. Campos de firma y validación",
    ];

    doc.fontSize(11).font("Helvetica").fillColor("#111827");
    indexItems.forEach((item, i) => {
      doc.text(`  ${item}`, { indent: 20 });
      doc.moveDown(0.3);
    });

    // ── RESUMEN EJECUTIVO ─────────────────────────────────────────────────────

    doc.addPage();
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("1. RESUMEN EJECUTIVO DE CUMPLIMIENTO", { underline: true });

    doc.moveDown();

    // Calcular estadísticas
    const total = actions.length;
    const cumplidas = actions.filter(a => a.estado === "cumplida").length;
    const enProceso = actions.filter(a => a.estado === "en_proceso").length;
    const noIniciadas = actions.filter(a => a.estado === "no_iniciada").length;
    const vencidas = actions.filter(a => a.estado === "vencida").length;
    const conEvidencia = actions.filter(a => a.evidencias.length > 0).length;
    const pctCumplimiento =
      total > 0 ? Math.round((cumplidas / total) * 100) : 0;
    const pctEvidencia =
      total > 0 ? Math.round((conEvidencia / total) * 100) : 0;

    // Tarjetas de estadísticas
    const cardW = (pageWidth - 20) / 3;
    const cardH = 60;
    const cardY = doc.y;

    const cards = [
      { label: "Total Acciones", value: total.toString(), color: COLOR_ACCENT },
      { label: "Cumplidas", value: cumplidas.toString(), color: COLOR_SUCCESS },
      {
        label: "% Cumplimiento",
        value: `${pctCumplimiento}%`,
        color:
          pctCumplimiento >= 80
            ? COLOR_SUCCESS
            : pctCumplimiento >= 50
              ? COLOR_WARNING
              : COLOR_DANGER,
      },
      {
        label: "En Proceso",
        value: enProceso.toString(),
        color: COLOR_WARNING,
      },
      { label: "Vencidas", value: vencidas.toString(), color: COLOR_DANGER },
      {
        label: "Con Evidencia",
        value: `${conEvidencia} (${pctEvidencia}%)`,
        color: COLOR_ACCENT,
      },
    ];

    for (let i = 0; i < cards.length; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = 50 + col * (cardW + 10);
      const cy = cardY + row * (cardH + 10);

      doc.rect(cx, cy, cardW, cardH).fillAndStroke(COLOR_LIGHT, "#d1d5db");
      doc
        .fillColor(cards[i].color)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(cards[i].value, cx, cy + 8, { width: cardW, align: "center" });
      doc
        .fillColor(COLOR_GRAY)
        .fontSize(9)
        .font("Helvetica")
        .text(cards[i].label, cx, cy + 38, { width: cardW, align: "center" });
    }

    doc.moveDown(8);

    // Barra de progreso visual
    const barY = doc.y + 5;
    const barW = pageWidth;
    doc.rect(50, barY, barW, 16).fillAndStroke("#e5e7eb", "#d1d5db");
    if (pctCumplimiento > 0) {
      doc
        .rect(50, barY, barW * (pctCumplimiento / 100), 16)
        .fill(
          pctCumplimiento >= 80
            ? COLOR_SUCCESS
            : pctCumplimiento >= 50
              ? COLOR_WARNING
              : COLOR_DANGER
        );
    }
    doc
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(`${pctCumplimiento}% de cumplimiento`, 50, barY + 3, {
        width: barW,
        align: "center",
      });

    doc.moveDown(2);

    // ── MATRIZ DE ACCIONES ────────────────────────────────────────────────────

    doc.addPage();
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("2. MATRIZ DE ACCIONES POR TIPO DE PROGRAMA", { underline: true });

    doc.moveDown();

    // Agrupar por tipoPlan
    const byTipo: Record<string, ActionWithEvidences[]> = {};
    for (const a of actions) {
      if (!byTipo[a.tipoPlan]) byTipo[a.tipoPlan] = [];
      byTipo[a.tipoPlan].push(a);
    }

    for (const [tipo, tipoActions] of Object.entries(byTipo)) {
      // Encabezado de sección
      doc
        .fillColor(COLOR_PRIMARY)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(TIPO_PLAN_LABELS[tipo] || tipo);
      doc.moveDown(0.3);

      // Encabezado de tabla
      const colWidths = [45, 160, 70, 60, 80, 80];
      const headers = [
        "ID",
        "Objetivo",
        "Estado",
        "Prioridad",
        "Responsable",
        "Plazo",
      ];
      let tableX = 50;
      const headerY = doc.y;

      doc.rect(50, headerY, pageWidth, 18).fill(COLOR_PRIMARY);
      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], tableX + 3, headerY + 4, {
          width: colWidths[i] - 6,
        });
        tableX += colWidths[i];
      }

      doc.moveDown(0.1);
      let rowBg = false;

      for (const action of tipoActions) {
        if (doc.y > doc.page.height - 100) doc.addPage();

        const rowY2 = doc.y;
        const rowH = 22;
        doc.rect(50, rowY2, pageWidth, rowH).fill(rowBg ? "#f9fafb" : "white");
        rowBg = !rowBg;

        const estadoColor =
          {
            cumplida: COLOR_SUCCESS,
            en_proceso: COLOR_ACCENT,
            vencida: COLOR_DANGER,
            no_iniciada: COLOR_GRAY,
            cancelada: COLOR_GRAY,
          }[action.estado] || COLOR_GRAY;

        tableX = 50;
        doc
          .fillColor(COLOR_PRIMARY)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(action.accionId, tableX + 3, rowY2 + 6, {
            width: colWidths[0] - 6,
          });
        tableX += colWidths[0];

        doc
          .fillColor("#111827")
          .font("Helvetica")
          .text(truncate(action.objetivo, 60), tableX + 3, rowY2 + 6, {
            width: colWidths[1] - 6,
          });
        tableX += colWidths[1];

        doc
          .fillColor(estadoColor)
          .text(
            ESTADO_LABELS[action.estado] || action.estado,
            tableX + 3,
            rowY2 + 6,
            { width: colWidths[2] - 6 }
          );
        tableX += colWidths[2];

        doc
          .fillColor("#111827")
          .text(
            action.prioridad.charAt(0).toUpperCase() +
              action.prioridad.slice(1),
            tableX + 3,
            rowY2 + 6,
            { width: colWidths[3] - 6 }
          );
        tableX += colWidths[3];

        doc.text(
          truncate(action.responsable || "—", 20),
          tableX + 3,
          rowY2 + 6,
          { width: colWidths[4] - 6 }
        );
        tableX += colWidths[4];

        doc.text(formatDate(action.plazo), tableX + 3, rowY2 + 6, {
          width: colWidths[5] - 6,
        });

        // Línea separadora
        doc
          .strokeColor("#e5e7eb")
          .lineWidth(0.5)
          .moveTo(50, rowY2 + rowH)
          .lineTo(50 + pageWidth, rowY2 + rowH)
          .stroke();

        doc.moveDown(0.1);
      }

      doc.moveDown(1);
    }

    // ── DETALLE DE ACCIONES Y EVIDENCIAS ──────────────────────────────────────

    doc.addPage();
    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("3. DETALLE DE ACCIONES Y EVIDENCIAS", { underline: true });

    doc.moveDown();

    const generateActionDetail = async () => {
      for (const action of actions) {
        if (doc.y > doc.page.height - 200) doc.addPage();

        // Encabezado de acción
        const accionY = doc.y;
        doc.rect(50, accionY, pageWidth, 24).fill(COLOR_PRIMARY);
        doc
          .fillColor("white")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(
            `${action.accionId} — ${truncate(action.objetivo, 80)}`,
            58,
            accionY + 6,
            { width: pageWidth - 16 }
          );

        doc.moveDown(0.2);

        // Datos de la acción
        const detailY = doc.y;
        doc
          .rect(50, detailY, pageWidth, 80)
          .fillAndStroke(COLOR_LIGHT, "#e5e7eb");

        doc.fillColor(COLOR_GRAY).fontSize(8).font("Helvetica");
        const col1 = 58;
        const col2 = 58 + pageWidth / 2;
        let dy = detailY + 8;

        doc
          .text("Acción:", col1, dy, { continued: true })
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(` ${truncate(action.accion, 80)}`, {
            width: pageWidth / 2 - 20,
          });
        doc
          .fillColor(COLOR_GRAY)
          .font("Helvetica")
          .text("Indicador:", col2, dy, { continued: true })
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(` ${truncate(action.indicador || "—", 60)}`, {
            width: pageWidth / 2 - 20,
          });

        dy += 16;
        doc
          .fillColor(COLOR_GRAY)
          .font("Helvetica")
          .text("Responsable:", col1, dy, { continued: true })
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(` ${action.responsable || "Sin asignar"}`, {
            width: pageWidth / 2 - 20,
          });
        doc
          .fillColor(COLOR_GRAY)
          .font("Helvetica")
          .text("Plazo:", col2, dy, { continued: true })
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(` ${formatDate(action.plazo)}`, { width: pageWidth / 2 - 20 });

        dy += 16;
        const estadoColor2 =
          {
            cumplida: COLOR_SUCCESS,
            en_proceso: COLOR_ACCENT,
            vencida: COLOR_DANGER,
            no_iniciada: COLOR_GRAY,
            cancelada: COLOR_GRAY,
          }[action.estado] || COLOR_GRAY;
        doc
          .fillColor(COLOR_GRAY)
          .font("Helvetica")
          .text("Estado:", col1, dy, { continued: true })
          .fillColor(estadoColor2)
          .font("Helvetica-Bold")
          .text(` ${ESTADO_LABELS[action.estado] || action.estado}`, {
            width: pageWidth / 2 - 20,
          });
        doc
          .fillColor(COLOR_GRAY)
          .font("Helvetica")
          .text("Prioridad:", col2, dy, { continued: true })
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(
            ` ${action.prioridad.charAt(0).toUpperCase() + action.prioridad.slice(1)}`,
            { width: pageWidth / 2 - 20 }
          );

        dy += 16;
        if (action.observaciones) {
          doc
            .fillColor(COLOR_GRAY)
            .font("Helvetica")
            .text("Observaciones:", col1, dy, { continued: true })
            .fillColor("#111827")
            .font("Helvetica")
            .text(` ${truncate(action.observaciones, 120)}`, {
              width: pageWidth - 20,
            });
        }

        doc.moveDown(0.5);

        // Evidencias
        if (action.evidencias.length === 0) {
          doc
            .fillColor(COLOR_DANGER)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("⚠ Sin evidencias registradas", { indent: 10 });
          doc.moveDown(0.5);
        } else {
          doc
            .fillColor(COLOR_SUCCESS)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(`✓ ${action.evidencias.length} evidencia(s) registrada(s):`, {
              indent: 10,
            });
          doc.moveDown(0.2);

          // Miniaturas de imágenes (máx 3 por fila)
          if (options.includeEvidenceThumbnails !== false) {
            const imageEvidences = action.evidencias.filter(e =>
              e.tipoArchivo.startsWith("image/")
            );

            if (imageEvidences.length > 0) {
              const thumbW = 100;
              const thumbH = 75;
              const thumbsPerRow = 3;
              let thumbX = 60;
              let thumbY = doc.y;

              for (let i = 0; i < Math.min(imageEvidences.length, 6); i++) {
                if (i > 0 && i % thumbsPerRow === 0) {
                  thumbX = 60;
                  thumbY += thumbH + 20;
                  if (thumbY > doc.page.height - 100) {
                    doc.addPage();
                    thumbY = 60;
                  }
                }

                try {
                  const imgBuffer = await fetchImageBuffer(
                    imageEvidences[i].fileUrl
                  );
                  if (imgBuffer) {
                    doc
                      .rect(thumbX - 1, thumbY - 1, thumbW + 2, thumbH + 2)
                      .stroke("#d1d5db");
                    doc.image(imgBuffer, thumbX, thumbY, {
                      width: thumbW,
                      height: thumbH,
                      fit: [thumbW, thumbH],
                    });
                    doc
                      .fillColor(COLOR_GRAY)
                      .fontSize(6)
                      .text(
                        truncate(imageEvidences[i].nombreArchivo, 20),
                        thumbX,
                        thumbY + thumbH + 2,
                        { width: thumbW }
                      );
                  }
                } catch {
                  // Si no se puede cargar la imagen, mostrar placeholder
                  doc
                    .rect(thumbX, thumbY, thumbW, thumbH)
                    .fillAndStroke("#f3f4f6", "#d1d5db");
                  doc
                    .fillColor(COLOR_GRAY)
                    .fontSize(7)
                    .text(
                      "Imagen no disponible",
                      thumbX,
                      thumbY + thumbH / 2 - 5,
                      { width: thumbW, align: "center" }
                    );
                }

                thumbX += thumbW + 15;
              }

              doc.moveDown(thumbH / 12 + 2);
            }
          }

          // Lista de evidencias no-imagen
          const nonImageEvidences = action.evidencias.filter(
            e => !e.tipoArchivo.startsWith("image/")
          );
          for (const ev of nonImageEvidences) {
            if (doc.y > doc.page.height - 80) doc.addPage();
            doc
              .fillColor("#111827")
              .fontSize(8)
              .font("Helvetica")
              .text(`  • ${ev.nombreArchivo}`, { indent: 20, continued: true });
            doc
              .fillColor(COLOR_GRAY)
              .text(
                `  [${TIPO_EVIDENCIA_LABELS[ev.tipoEvidencia] || ev.tipoEvidencia}]  ${formatDate(ev.fechaSubida)}`
              );
            if (ev.descripcion) {
              doc
                .fillColor(COLOR_GRAY)
                .fontSize(7)
                .text(`    ${ev.descripcion}`, { indent: 30 });
            }
          }
        }

        doc.moveDown(1);
      }
    };

    // Ejecutar la generación asíncrona de detalles
    generateActionDetail()
      .then(() => {
        // ── CAMPOS DE FIRMA ───────────────────────────────────────────────────

        doc.addPage();
        doc
          .fillColor(COLOR_PRIMARY)
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("4. VALIDACIÓN Y FIRMA", { underline: true });

        doc.moveDown();

        doc
          .fillColor("#111827")
          .fontSize(10)
          .font("Helvetica")
          .text(
            "Los suscritos hacemos constar que el presente reporte de seguimiento de la Matriz de Acciones " +
              "del Programa de Intervención NOM-035-STPS-2018 ha sido revisado y validado, comprometiéndonos " +
              "a dar seguimiento a las acciones pendientes en los plazos establecidos.",
            { align: "justify" }
          );

        doc.moveDown(2);

        // Dos columnas de firma
        const sigW = (pageWidth - 40) / 2;
        const sigY = doc.y;

        // Firma 1: Responsable NOM-035
        doc.rect(50, sigY, sigW, 100).fillAndStroke(COLOR_LIGHT, "#d1d5db");
        doc
          .fillColor(COLOR_GRAY)
          .fontSize(8)
          .font("Helvetica")
          .text("RESPONSABLE NOM-035", 55, sigY + 8, {
            width: sigW - 10,
            align: "center",
          });

        if (plan.firmaNombreResponsable) {
          doc
            .fillColor(COLOR_PRIMARY)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(plan.firmaNombreResponsable, 55, sigY + 30, {
              width: sigW - 10,
              align: "center",
            });
          doc
            .fillColor(COLOR_GRAY)
            .fontSize(8)
            .font("Helvetica")
            .text(plan.firmaCargoResponsable || "Responsable", 55, sigY + 48, {
              width: sigW - 10,
              align: "center",
            });
        } else {
          // Línea de firma en blanco
          doc
            .strokeColor("#9ca3af")
            .lineWidth(1)
            .moveTo(70, sigY + 60)
            .lineTo(50 + sigW - 20, sigY + 60)
            .stroke();
          doc
            .fillColor(COLOR_GRAY)
            .fontSize(8)
            .text("Nombre y firma", 55, sigY + 65, {
              width: sigW - 10,
              align: "center",
            });
          doc.text("Cargo / Puesto", 55, sigY + 78, {
            width: sigW - 10,
            align: "center",
          });
        }

        doc
          .fillColor(COLOR_GRAY)
          .fontSize(7)
          .text(
            `Fecha: ${plan.firmaFecha ? formatDate(plan.firmaFecha) : "_______________"}`,
            55,
            sigY + 88,
            { width: sigW - 10, align: "center" }
          );

        // Firma 2: Representante Legal / Dirección
        const sig2X = 50 + sigW + 40;
        doc.rect(sig2X, sigY, sigW, 100).fillAndStroke(COLOR_LIGHT, "#d1d5db");
        doc
          .fillColor(COLOR_GRAY)
          .fontSize(8)
          .font("Helvetica")
          .text(
            "REPRESENTANTE LEGAL / DIRECCIÓN GENERAL",
            sig2X + 5,
            sigY + 8,
            { width: sigW - 10, align: "center" }
          );

        if (plan.firmaNombreRepLegal) {
          doc
            .fillColor(COLOR_PRIMARY)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(plan.firmaNombreRepLegal, sig2X + 5, sigY + 30, {
              width: sigW - 10,
              align: "center",
            });
          doc
            .fillColor(COLOR_GRAY)
            .fontSize(8)
            .font("Helvetica")
            .text(
              plan.firmaCargoRepLegal || "Representante Legal",
              sig2X + 5,
              sigY + 48,
              { width: sigW - 10, align: "center" }
            );
        } else {
          doc
            .strokeColor("#9ca3af")
            .lineWidth(1)
            .moveTo(sig2X + 20, sigY + 60)
            .lineTo(sig2X + sigW - 20, sigY + 60)
            .stroke();
          doc
            .fillColor(COLOR_GRAY)
            .fontSize(8)
            .text("Nombre y firma", sig2X + 5, sigY + 65, {
              width: sigW - 10,
              align: "center",
            });
          doc.text("Cargo / Puesto", sig2X + 5, sigY + 78, {
            width: sigW - 10,
            align: "center",
          });
        }

        doc
          .fillColor(COLOR_GRAY)
          .fontSize(7)
          .text(
            `Fecha: ${plan.firmaFecha ? formatDate(plan.firmaFecha) : "_______________"}`,
            sig2X + 5,
            sigY + 88,
            { width: sigW - 10, align: "center" }
          );

        doc.moveDown(8);

        // ── PIE DE PÁGINA ─────────────────────────────────────────────────────

        const footerY = doc.page.height - 60;
        doc
          .strokeColor("#d1d5db")
          .lineWidth(1)
          .moveTo(50, footerY)
          .lineTo(50 + pageWidth, footerY)
          .stroke();

        doc
          .fillColor(COLOR_GRAY)
          .fontSize(7)
          .font("Helvetica")
          .text(
            `Folio: ${folio}  |  Generado el ${formatDate(now)}  |  Sistema de Gestión NOM-035-STPS-2018`,
            50,
            footerY + 8,
            { width: pageWidth, align: "center" }
          );

        doc.text(
          "Este documento tiene validez como evidencia de cumplimiento ante la STPS.",
          50,
          footerY + 20,
          { width: pageWidth, align: "center" }
        );

        doc.end();
      })
      .catch(reject);
  });
}
