import { useState, useRef, useEffect } from "react";
import { PlusCircle, Upload, Check, Download, FileText, FileCheck, MapPin, ChevronDown, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { useInventory } from "../context/InventoryContext.jsx";
import Button from "./common/Button";
import Input from "./common/Input";
import Badge from "./common/Badge";
import Modal from "./common/Modal";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import { CATEGORIES } from "./utils/constants";
import { toast } from "sonner";
import { useMenuClick } from "./Layout.jsx";
import "./StockInsertion.css";

// ---------- Credit Note Dropdown ----------
function BeautifiedCreditNoteDropdown({ value, onChange, onSelect, availableReturns }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = availableReturns.filter((r) => {
    if (!value) return true;
    const q = value.toLowerCase();
    return (
      (r.creditNote || "").toLowerCase().includes(q) ||
      (r.productName || r.product || "").toLowerCase().includes(q) ||
      (r.oldBatchNo || r.batchNo || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="si-cn-dropdown-wrapper" ref={containerRef} style={{ position: "relative" }}>
      <div className="si-cn-input-box" style={{ display: "flex", alignItems: "center", position: "relative" }}>
        <input
          type="text"
          className="si-new-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or enter Credit Note number..."
          style={{ paddingRight: "36px" }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6B7280",
            padding: "4px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {isOpen && (
        <div
          className="si-cn-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            maxHeight: "260px",
            overflowY: "auto",
            padding: "6px"
          }}
        >
          <div style={{ padding: "6px 10px", fontSize: "11px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #F3F4F6", marginBottom: "4px" }}>
            Available Credit Notes ({availableReturns.length})
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "12px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
              No matching credit notes. Type to enter a custom credit note number.
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = value === item.creditNote;
              const prodName = item.productName || item.product || "Product";
              const batch = item.oldBatchNo || item.batchNo;
              return (
                <div
                  key={item.returnId || item.id || item.creditNote}
                  onClick={() => {
                    onSelect(item.creditNote);
                    setIsOpen(false);
                  }}
                  className={`si-cn-item ${isSelected ? "si-cn-item--selected" : ""}`}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    marginBottom: "4px",
                    transition: "background 0.15s ease",
                    background: isSelected ? "#EFF6FF" : "#FFFFFF",
                    border: isSelected ? "1px solid #BFDBFE" : "1px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "#FFFFFF"; }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: "700", fontSize: "13px", color: "#2563EB", background: "#DBEAFE", padding: "2px 8px", borderRadius: "4px" }}>
                        {item.creditNote}
                      </span>
                      <span style={{ fontWeight: "600", fontSize: "13px", color: "#1F2937" }}>
                        {prodName}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6B7280", display: "flex", gap: "10px" }}>
                      {batch && <span>Batch: <strong>{batch}</strong></span>}
                      {item.quantity && <span>Qty: <strong>{item.quantity}</strong></span>}
                      {item.reason && <span>Reason: {item.reason}</span>}
                    </div>
                  </div>
                  {isSelected && <Check size={16} color="#2563EB" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Main Component ----------
export default function StockInsertion() {
  const onMenuClick = useMenuClick();
  const { receiveStock, bulkReceiveStock, returns } = useInventory();
  const [csvPreview, setCsvPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreditNoteField, setShowCreditNoteField] = useState(false);
  const fileInputRef = useRef(null);

  // Available credit notes: return rows with a creditNote value
  const availableReturns = (returns || []).filter(
    (r) => r.creditNote || r.credit_note || r.creditNoteNumber
  );

  const emptyForm = {
    invoiceNumber: "",
    creditNoteNumber: "",
    refNo: "",
    category: "",
    companyName: "",
    productName: "",
    size: "",
    lotNo: "",
    quantity: "",
    expiryDate: "",
    freshLocation: "",
    returnedLocation: "",
  };

  const [form, setForm] = useState(emptyForm);

  const handleCreditNoteSelect = (creditNoteNumber) => {
    const matching = availableReturns.find(
      (r) => (r.creditNote || r.credit_note || r.creditNoteNumber) === creditNoteNumber
    );
    if (matching) {
      setForm((prev) => ({
        ...prev,
        creditNoteNumber,
        productName: matching.productName || matching.product || prev.productName,
        companyName: matching.companyName || matching.company || prev.companyName,
        category: matching.category || prev.category,
        lotNo: matching.oldBatchNo || matching.batchNo || prev.lotNo,
      }));
      toast.info(`Auto-filled from credit note: ${matching.productName || matching.product || ""}`);
    } else {
      setForm((prev) => ({ ...prev, creditNoteNumber }));
    }
  };

  // ---------- Single Add ----------
  const handleNewSubmit = async () => {
    const required = ["refNo", "invoiceNumber", "companyName", "productName", "lotNo", "quantity", "expiryDate"];
    const missing = required.filter((k) => !form[k]);
    if (missing.length > 0) {
      toast.error(`Missing required: ${missing.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    const result = await receiveStock({
      ref_no: form.refNo,
      lot_no: form.lotNo,
      quantity: Number(form.quantity),
      invoice_no: form.invoiceNumber,
      credit_note_no: form.creditNoteNumber || null,
      expiry_date: form.expiryDate,
      product_name: form.productName,
      category: form.category,
      size: form.size,
      company_name: form.companyName,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success(`Added ${form.quantity} unit(s) of ${form.productName}`);
      setForm(emptyForm);
      setShowCreditNoteField(false);
    } else {
      toast.error(result.message || "Failed to add stock");
    }
  };

  // ---------- File Handling ----------
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        const validated = jsonData.map((row) => {
          const errors = [];
          if (!row.refNo) errors.push("Missing refNo");
          if (!row.lotNo) errors.push("Missing lotNo");
          if (!row.quantity || Number(row.quantity) < 1) errors.push("Missing/invalid quantity");
          return { ...row, _errors: errors };
        });

        setCsvPreview(validated);
        const valid = validated.filter((r) => r._errors.length === 0).length;
        toast.success(`Loaded ${valid} valid rows (of ${validated.length})`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ---------- Bulk Import ----------
  const handleBulkImport = async () => {
    const valid = csvPreview.filter((r) => r._errors.length === 0);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    const rows = valid.map((r) => ({
      ref_no: r.refNo,
      lot_no: r.lotNo,
      quantity: Number(r.quantity),
      invoice_no: r.invoiceNumber || null,
      credit_note_no: r.creditNoteNumber || null,
      expiry_date: r.expiryDate || null,
      product_name: r.productName,
      category: r.category,
      size: r.size,
      company_name: r.companyName,
    }));

    setIsSubmitting(true);
    const result = await bulkReceiveStock(rows);
    setIsSubmitting(false);

    if (result.success) {
      if (result.failed === 0) {
        toast.success(`Imported ${result.imported} row(s) successfully`);
      } else {
        toast.warning(`Imported ${result.imported}, failed ${result.failed}`);
        console.warn("Bulk import errors:", result.errors);
      }
      setCsvPreview(null);
    } else {
      toast.error(result.message || "Bulk import failed");
    }
  };

  // ---------- Template ----------
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{
  invoiceNumber: "",
  creditNoteNumber: "",
  refNo: "",
  category: "",
  companyName: "",
  productName: "",
  size: "",
  lotNo: "",
  quantity: "",
  expiryDate: "",
  freshLocation: "",
  returnedLocation: "",
}]);
    ws["!cols"] = [
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
      { wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
      { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const validCount = csvPreview ? csvPreview.filter((r) => r._errors.length === 0).length : 0;
  const invalidCount = csvPreview ? csvPreview.filter((r) => r._errors.length > 0).length : 0;

  return (
    <>
      <DashboardHeader title="Stock Insertion" onMenuClick={onMenuClick} />

      <main className="stock-insertion">
        <div className="si-container">
          {/* ---------- Single Add ---------- */}
          <div className="si-new-section">
            <div className="si-header-row">
              <h3 className="si-section-title">Add New Inventory Item</h3>
              <div className="si-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className={`si-credit-toggle-btn ${showCreditNoteField ? "si-credit-toggle-btn--active" : ""}`}
                  onClick={() => {
                    if (showCreditNoteField) {
                      setForm((prev) => ({ ...prev, creditNoteNumber: "" }));
                    }
                    setShowCreditNoteField(!showCreditNoteField);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: showCreditNoteField ? "1px solid #F59E0B" : "1px dashed #D1D5DB",
                    background: showCreditNoteField ? "#FEF3C7" : "#FFFFFF",
                    color: showCreditNoteField ? "#B45309" : "#4B5563",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <FileCheck size={14} />
                  {showCreditNoteField ? "Remove Credit Note" : "+ Attach Credit Note"}
                </button>
                <div className="si-doc-badge">
                  {form.creditNoteNumber ? (
                    <span className="si-badge si-badge-credit">
                      <FileCheck size={14} /> Credit Note: {form.creditNoteNumber}
                    </span>
                  ) : form.invoiceNumber ? (
                    <span className="si-badge si-badge-invoice">
                      <FileText size={14} /> Invoice: {form.invoiceNumber}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="si-new-grid">
              <div className="si-new-field">
                <label className="si-new-label">Ref No *</label>
                <Input value={form.refNo} onChange={(e) => setForm({ ...form, refNo: e.target.value })} placeholder="e.g. 36704" className="si-new-input" />
              </div>

              <div className="si-new-field">
                <label className="si-new-label">Invoice Number *</label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="INV-2024-XXX" className="si-new-input" />
              </div>

              {showCreditNoteField && (
                <div className="si-new-field">
                  <label className="si-new-label">Credit Note Number</label>
                  <BeautifiedCreditNoteDropdown
                    value={form.creditNoteNumber}
                    onChange={(val) => setForm((prev) => ({ ...prev, creditNoteNumber: val }))}
                    onSelect={handleCreditNoteSelect}
                    availableReturns={availableReturns}
                  />
                </div>
              )}

              <div className="si-new-field">
                <label className="si-new-label">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="si-new-input"
                >
                  <option value="">-- Select Category --</option>
                  {CATEGORIES.filter(c => c !== "All Categories").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <Input label="Company Name *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="si-new-input" />
              <Input label="Product Name *" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="si-new-input" />
              <Input label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="si-new-input" />
              <Input label="Lot No *" value={form.lotNo} onChange={(e) => setForm({ ...form, lotNo: e.target.value })} className="si-new-input" />
              <Input
                label="Quantity *"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.quantity}
                onChange={(e) => {
                  if (/^\d*$/.test(e.target.value)) {
                    setForm({ ...form, quantity: e.target.value });
                  }
                }}
                className="si-new-input"
              />
              <Input label="Expiry Date *" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="si-new-input" />

              <div className="si-new-field">
                <label className="si-new-label">Fresh Location</label>
                <div className="si-location-input">
                  <MapPin size={16} className="si-location-icon" />
                  <input type="text" value={form.freshLocation} onChange={(e) => setForm({ ...form, freshLocation: e.target.value })} placeholder="Shelf-A1" className="si-new-input" />
                </div>
              </div>

              <div className="si-new-field">
                <label className="si-new-label">Returned Location</label>
                <div className="si-location-input">
                  <MapPin size={16} className="si-location-icon" />
                  <input type="text" value={form.returnedLocation} onChange={(e) => setForm({ ...form, returnedLocation: e.target.value })} placeholder="Shelf-B2" className="si-new-input" />
                </div>
              </div>
            </div>

            <div className="si-new-actions">
              <Button onClick={handleNewSubmit} className="si-add-btn" disabled={isSubmitting}>
                <PlusCircle size={16} /> {isSubmitting ? "Adding..." : `Add ${form.quantity ? `${form.quantity} Unit(s)` : "Item"}`}
              </Button>
            </div>
          </div>

          {/* ---------- Bulk Import ---------- 
          <div className="si-bulk-section-wrapper">
            <div className="si-bulk-header">
              <h3 className="si-section-title">Bulk Import Inventory</h3>
              <Button variant="secondary" onClick={downloadTemplate} className="si-download-btn">
                <Download size={16} /> Download Template
              </Button>
            </div>

            <div
              className={`si-bulk-section ${isDragging ? "si-bulk-dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="si-bulk-content">
                <div className="si-bulk-left">
                  <div className="si-bulk-icon"><Upload size={22} /></div>
                  <div>
                    <p className="si-bulk-title">Upload Excel File</p>
                    <p className="si-bulk-desc">Drag & drop an Excel file (.xlsx) or click Browse.</p>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="si-browse-btn">
                  Browse Files
                </Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="si-hidden-input" onChange={(e) => handleFile(e.target.files[0])} />
              </div>
            </div>
          </div>*/}

          {/* ---------- Preview Modal ---------- */}
          <Modal
            isOpen={!!csvPreview}
            onClose={() => setCsvPreview(null)}
            title={`Import Preview — ${validCount} valid, ${invalidCount} invalid`}
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setCsvPreview(null)} className="si-modal-cancel">Cancel</Button>
                <Button onClick={handleBulkImport} className="si-modal-import" disabled={isSubmitting || validCount === 0}>
                  <Check size={16} /> {isSubmitting ? "Importing..." : `Import ${validCount} Row(s)`}
                </Button>
              </>
            }
          >
            {csvPreview && (
              <div className="si-preview-wrapper">
                <table className="si-preview-table">
                  <thead>
                    <tr className="si-preview-header">
                      {["Status", "Ref No", "Invoice #", "Credit Note", "Product", "Category", "Company", "Size", "Lot No", "Qty", "Expiry", "Fresh Loc", "Returned Loc"].map((h) => (
                        <th key={h} className="si-preview-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="si-preview-row">
                        <td className="si-preview-td">
                          {row._errors.length === 0
                            ? <Check size={16} color="#059669" />
                            : <XCircle size={16} color="#DC2626" title={row._errors.join(", ")} />}
                        </td>
                        <td className="si-preview-td si-preview-lot">{row.refNo}</td>
                        <td className="si-preview-td">{row.invoiceNumber || "—"}</td>
                        <td className="si-preview-td">{row.creditNoteNumber || "—"}</td>
                        <td className="si-preview-td">{row.productName || "—"}</td>
                        <td className="si-preview-td"><Badge variant="primary">{row.category || "—"}</Badge></td>
                        <td className="si-preview-td">{row.companyName || "—"}</td>
                        <td className="si-preview-td">{row.size || "—"}</td>
                        <td className="si-preview-td si-preview-lot">{row.lotNo}</td>
                        <td className="si-preview-td">{row.quantity}</td>
                        <td className="si-preview-td">{row.expiryDate || "—"}</td>
                        <td className="si-preview-td">{row.freshLocation || "—"}</td>
                        <td className="si-preview-td">{row.returnedLocation || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Modal>
        </div>
      </main>
    </>
  );
}
