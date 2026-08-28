/** Exportador CSV ligero para reportes tabulares sin formato avanzado. */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    return /[\",\n]/.test(text) ? \"\" + text.replace(/\"/g, \"\"\") + \"\" : text;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
