import * as XLSX from "xlsx";

/**
 * Converts an array of row objects to an Excel (.xlsx) file and triggers a browser download.
 * columns: [{ key: "issueId", label: "Issue ID" }, ...]
 */
export function exportToExcel(filename, columns, rows) {
  const data = rows.map((row) => {
    const obj = {};
    columns.forEach((c) => {
      obj[c.label] = row[c.key] ?? "";
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  const cleanName = filename.replace(/\.(csv|xlsx)$/i, "");
  XLSX.writeFile(workbook, `${cleanName}.xlsx`);
}

// Backwards compatibility alias: all export calls export native Excel (.xlsx) files
export const exportToCsv = exportToExcel;
