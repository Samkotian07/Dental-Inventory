import { useRef, useState } from "react";
import { Upload } from "lucide-react";
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
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFeedback({ type: "error", text: "Please upload a .csv file." });
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsv(text).filter((r) => r.name && r.campusId);

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
          <strong>Bulk Import Students</strong>
          <span>Drag &amp; drop a CSV file or browse. Columns: name, campusId, course, semester</span>
        </div>

        <button className="bulk-import__browse" onClick={() => inputRef.current?.click()}>
          Browse Files
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {feedback && <p className={`bulk-import__feedback bulk-import__feedback--${feedback.type}`}>{feedback.text}</p>}
    </div>
  );
}
