type XlsxModule = typeof import("xlsx");

let modulePromise: Promise<XlsxModule> | undefined;

/** Descarga XLSX solo cuando el usuario importa o exporta información tabular. */
export function loadXlsx(): Promise<XlsxModule> {
  modulePromise ??= import("xlsx");
  return modulePromise;
}
