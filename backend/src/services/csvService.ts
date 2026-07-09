import Papa, { ParseResult, ParseError } from "papaparse";

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export function parseCSVBuffer(buffer: Buffer): ParsedCSV {
  const csvString = buffer.toString("utf-8");

  let parseResult: ParseResult<Record<string, string>> | null = null;

  Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transform: (value: string) => value.trim(),
    complete: (results) => {
      parseResult = results;
    },
  });

  if (!parseResult) {
    throw new Error("CSV parsing produced no result");
  }

  const result = parseResult as ParseResult<Record<string, string>>;

  if (result.errors && result.errors.length > 0) {
    const criticalErrors = result.errors.filter(
      (e: ParseError) => e.type === "Delimiter" && result.data.length === 0
    );
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parse error: ${result.errors[0].message}`);
    }
  }

  // Trim header keys manually in case trimHeaders is not supported
  const rawHeaders: string[] = (result.meta.fields || []).map((h: string) => h.trim());

  // Re-map rows to use trimmed headers
  const rows: Record<string, string>[] = result.data.map((row) => {
    const newRow: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      const trimmedKey = key.trim();
      newRow[trimmedKey] = row[key] || "";
    }
    return newRow;
  });

  return {
    headers: rawHeaders,
    rows,
    totalRows: rows.length,
  };
}
