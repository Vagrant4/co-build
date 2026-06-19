export type CsvValue = string | number | boolean | Date | null | undefined;
export type CsvRow = Record<string, CsvValue>;
export type CsvColumn = {
  key: string;
  header: string;
};

export function toCsv(rows: CsvRow[], columns: CsvColumn[]): string {
  const header = columns.map((column) => escapeCsv(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsv(formatCsvValue(row[column.key]))).join(","));

  return [header, ...body].join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}

function formatCsvValue(value: CsvValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
