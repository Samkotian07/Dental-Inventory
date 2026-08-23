import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import "./BulkImportPanel.css";

// Minimal CSV parser for simple, unquoted-comma files with a header row.
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const campusIdx = header.indexOf("campusid");
  const courseIdx = header.indexOf("course");
  const semIdx = header.indexOf("semester");

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return {
      name: cells[nameIdx] ?? "",
      campusId: cells[campusIdx] ?? "",
      course: cells[courseIdx] ?? "",
      semester: cells[semIdx] ?? "",
    };
  });
}

export default function BulkImportPanel({ onImport }) {
  const [dragOver, setDragOver] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    
    // Check if it's CSV or Excel
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isExcel = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
    
    if (!isCsv && !isExcel) {
      setFeedback({ type: "error", text: "Please upload a .csv or .xlsx file." });
      return;
    }

    try {
      let rows = [];
      
      if (isCsv) {
        const text = await file.text();
        rows = parseCsv(text).filter((r) => r.name && r.campusId);
      } else {
        // Handle Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        rows = jsonData
          .filter((r) => r.name && r.campusId)
          .map((r) => ({
            name: r.name,
            campusId: r.campusId || r.campusid,
            course: r.course || "",
            semester: r.semester || "",
          }));
      }

      if (rows.length === 0) {
        setFeedback({
          type: "error",
          text: "No valid rows found. Expected columns: name, campusId, course, semester.",
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      onImport(rows.map((r) => ({ ...r, added: today })));
      setFeedback({ type: "success", text: `Imported ${rows.length} student(s) from ${file.name}.` });
    } catch {
      setFeedback({ type: "error", text: "Couldn't read that file. Please try again." });
    }
  };

  // Download Excel Template (headers only)
  const downloadTemplate = () => {
    // Create headers only (no sample data)
    const headers = ["name", "campusId", "course", "semester"];
    
    // Create workbook with headers only
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        name: "",
        campusId: "",
        course: "",
        semester: ""
      }
    ]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // name
      { wch: 15 }, // campusId
      { wch: 20 }, // course
      { wch: 15 }, // semester
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_bulk_import_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    setFeedback({ type: "success", text: "Template downloaded successfully!" });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="bulk-import">
      <div
        className={`bulk-import__drop ${dragOver ? "is-dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <span className="bulk-import__icon">
          <Upload size={16} strokeWidth={2.2} />
        </span>

        <div className="bulk-import__text">
          <strong>Upload Excel or CSV</strong>
          <span>Drag &amp; drop a file or browse. Supports .xlsx</span>
        </div>

        <div className="bulk-import__actions">
          <button className="bulk-import__download-btn" onClick={downloadTemplate}>
            <FileSpreadsheet size={16} />
            Download Template
          </button>
          <button className="bulk-import__browse" onClick={() => inputRef.current?.click()}>
            Browse Files
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {feedback && <p className={`bulk-import__feedback bulk-import__feedback--${feedback.type}`}>{feedback.text}</p>}
    </div>
  );
}