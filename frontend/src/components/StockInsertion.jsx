import { useState, useRef, useEffect } from "react";
import { PlusCircle, Upload, Check, Download, FileText, FileCheck, MapPin, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { useInventory } from "../context/InventoryContext.jsx";
import Button from "./common/Button";
import Input from "./common/Input";
import Badge from "./common/Badge";
import Modal from "./common/Modal";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import { CATEGORIES } from "./utils/constants";
import { generateId } from "./utils/helpers";
import { toast } from "sonner";
import { useMenuClick } from "./Layout.jsx";
import "./StockInsertion.css";

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

export default function StockInsertion() {
  const onMenuClick = useMenuClick();
  const { addStockItem, returns, updateReturnStatus } = useInventory();
  const [csvPreview, setCsvPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCreditNoteField, setShowCreditNoteField] = useState(false);
  const fileInputRef = useRef(null);

  // ⭐ Get available credit notes (not yet used)
  const availableCreditNotes = (returns || [])
    .filter((r) => r.creditNote && !r.creditNoteUsed && !r.is_credit_note_used && !r.isCreditNoteUsed)
    .map((r) => r.creditNote);

  const [form, setForm] = useState({
    invoiceNumber: "",
    creditNoteNumber: "",
    category: CATEGORIES[0],
    companyName: "",
    productName: "",
    size: "",
    lotNo: "",
    quantity: "",
    expiryDate: "",
    freshLocation: "",
    returnedLocation: "",
  });

  // ⭐ Handle Credit Note selection - auto-fill product details
  const handleCreditNoteSelect = (creditNoteNumber) => {
    const matching = (returns || []).find((r) => r.creditNote === creditNoteNumber);
    if (matching) {
      setForm((prev) => ({
        ...prev,
        creditNoteNumber: creditNoteNumber,
        productName: matching.productName || matching.product || prev.productName,
        companyName: matching.companyName || matching.company || prev.companyName,
        category: matching.category || prev.category,
        lotNo: matching.oldBatchNo || matching.batchNo || prev.lotNo,
      }));
      toast.info(`Auto-filled from credit note: ${matching.productName}`);
    } else {
      setForm((prev) => ({ ...prev, creditNoteNumber: creditNoteNumber }));
    }
  };

  // ⭐ Create individual units for each quantity
  const handleNewSubmit = async () => {
    if (
      !form.invoiceNumber ||
      !form.companyName ||
      !form.productName ||
      !form.lotNo ||
      !form.quantity ||
      !form.expiryDate
    ) {
      toast.error("Please fill all required fields (Invoice Number, Company, Product, Lot No, Quantity, Expiry)");
      return;
    }

    let vendorReturn = null;
    if (form.creditNoteNumber) {
      vendorReturn = (returns || []).find((r) => r.creditNote === form.creditNoteNumber);
      if (!vendorReturn) {
        toast.error("Credit note not found in vendor returns");
        return;
      }
      if (vendorReturn.creditNoteUsed || vendorReturn.is_credit_note_used || vendorReturn.isCreditNoteUsed) {
        toast.error("This credit note has already been used");
        return;
      }
    }

    const totalQty = Number(form.quantity);

    const itemData = {
      documentNumber: form.invoiceNumber,
      invoiceNumber: form.invoiceNumber,
      creditNoteNumber: form.creditNoteNumber || "",
      category: form.category,
      companyName: form.companyName,
      productName: form.productName,
      size: form.size,
      lotNo: form.lotNo,
      expiryDate: form.expiryDate,
      refNo: generateId("INV"),
      documentType: form.creditNoteNumber ? "creditNote" : "invoice",
      invoiceNo: form.invoiceNumber,
      creditNoteNo: form.creditNoteNumber || "",
      freshLocation: form.freshLocation,
      returnedLocation: form.returnedLocation,
      qty: totalQty,
      quantity: totalQty,
      product: form.productName,
      company: form.companyName,
      expiry: form.expiryDate,
      status: "active",
      lot_no: form.lotNo,
    };
    
    const result = await addStockItem(itemData);

    if (result.success) {
      if (form.creditNoteNumber && vendorReturn) {
        const replacementUnitId = result.data?.id || result.data?.unitId || result.data?.refNo || itemData.refNo;
        await updateReturnStatus(vendorReturn.returnId || vendorReturn.id, "completed", {
          is_credit_note_used: true,
          replacement_unit_id: replacementUnitId,
        });
        toast.success(`Credit note ${form.creditNoteNumber} marked as used and linked to ${replacementUnitId}`);
      }

      toast.success(`Added stock item ${form.productName} (Quantity: ${totalQty}) successfully`);
      setForm({
        invoiceNumber: "",
        creditNoteNumber: "",
        category: CATEGORIES[0],
        companyName: "",
        productName: "",
        size: "",
        lotNo: "",
        quantity: "",
        expiryDate: "",
        freshLocation: "",
        returnedLocation: "",
      });
    } else {
      toast.error(result.message || "Failed to add stock item");
    }
  };

  // ⭐ File handlers
  const handleFile = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const valid = jsonData.filter((r) => r.productName && r.lotNo);
        setCsvPreview(valid);
        toast.success(`Loaded ${valid.length} items from Excel`);
      } catch (err) {
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

  const handleBulkImport = () => {
    let totalImported = 0;
    
    csvPreview.forEach((row) => {
      const qty = Number(row.quantity) || 1;
      const itemData = {
        ...row,
        refNo: generateId("INV"),
        documentType: form.creditNoteNumber ? "creditNote" : "invoice",
        invoiceNo: form.invoiceNumber || row.invoiceNumber || row.documentNumber || "",
        creditNoteNo: form.creditNoteNumber || "",
        category: row.category || "General",
        qty: qty,
        quantity: qty,
        product: row.productName || row.product || "Dental Item",
        company: row.companyName || row.company || "Vendor",
        expiry: row.expiryDate || row.expiry || "",
        size: row.size || "",
        status: "active",
        lot_no: row.lotNo,
        freshLocation: row.freshLocation || "",
        returnedLocation: row.returnedLocation || "",
      };
      addStockItem(itemData);
      totalImported++;
    });
    
    toast.success(`Imported ${totalImported} stock items successfully`);
    setCsvPreview(null);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        invoiceNumber: "",
        creditNoteNumber: "",
        category: "",
        companyName: "",
        productName: "",
        size: "",
        lotNo: "",
        quantity: "",
        expiryDate: "",
        freshLocation: "",
        returnedLocation: "",
      }
    ]);

    const colWidths = [
      { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 25 }, { wch: 25 }, { wch: 12 },
      { wch: 15 }, { wch: 10 }, { wch: 15 },
      { wch: 20 }, { wch: 20 },
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };

  return (
    <>
      <DashboardHeader title="Stock Insertion" onMenuClick={onMenuClick} />

      <main className="stock-insertion">
        <div className="si-container">
          {/* New Item Section */}
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
              {/* Invoice Number - Always visible */}
              <div className="si-new-field">
                <label className="si-new-label">Invoice Number *</label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  placeholder="INV-2024-XXX"
                  className="si-new-input"
                />
              </div>

              {/* Credit Note Number - Toggleable (Beautified Dropdown) */}
              {showCreditNoteField && (
                <div className="si-new-field">
                  <label className="si-new-label">Credit Note Number</label>
                  <BeautifiedCreditNoteDropdown
                    value={form.creditNoteNumber}
                    onChange={(val) => setForm((prev) => ({ ...prev, creditNoteNumber: val }))}
                    onSelect={(val) => handleCreditNoteSelect(val)}
                    availableReturns={(returns || []).filter(
                      (r) => r.creditNote && !r.creditNoteUsed && !r.is_credit_note_used && !r.isCreditNoteUsed
                    )}
                  />
                </div>
              )}

              {/* Category - Type or select from available */}
              <div className="si-new-field">
                <label className="si-new-label">Category *</label>
                <Input
                  list="categories-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Select or enter category..."
                  className="si-new-input"
                />
                <datalist id="categories-list">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Company Name */}
              <Input
                label="Company Name *"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="si-new-input"
              />

              {/* Product Name */}
              <Input
                label="Product Name *"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className="si-new-input"
              />

              {/* Size */}
              <Input
                label="Size"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="si-new-input"
              />

              {/* Lot No */}
              <Input
                label="Lot No *"
                value={form.lotNo}
                onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
                className="si-new-input"
              />

              {/* Quantity */}
              <Input
                label="Quantity *"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="si-new-input"
              />

              {/* Expiry Date */}
              <Input
                label="Expiry Date *"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="si-new-input"
              />

              {/* Fresh Location */}
              <div className="si-new-field">
                <label className="si-new-label">Fresh Location</label>
                <div className="si-location-input">
                  <MapPin size={16} className="si-location-icon" />
                  <input
                    type="text"
                    value={form.freshLocation}
                    onChange={(e) => setForm({ ...form, freshLocation: e.target.value })}
                    placeholder="e.g., Shelf-A1, Cabinet-B2"
                    className="si-new-input"
                  />
                </div>
              </div>

              {/* Returned Location */}
              <div className="si-new-field">
                <label className="si-new-label">Returned Location</label>
                <div className="si-location-input">
                  <MapPin size={16} className="si-location-icon" />
                  <input
                    type="text"
                    value={form.returnedLocation}
                    onChange={(e) => setForm({ ...form, returnedLocation: e.target.value })}
                    placeholder="e.g., Shelf-C3, Cabinet-D4"
                    className="si-new-input"
                  />
                </div>
              </div>
            </div>

            <div className="si-new-actions">
              <Button onClick={handleNewSubmit} className="si-add-btn">
                <PlusCircle size={16} /> Add {form.quantity ? `${form.quantity} Unit(s)` : 'Item'}
              </Button>
            </div>
          </div>

          {/* Bulk Import Section */}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="si-hidden-input"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            </div>
          </div>

          {/* Preview Modal */}
          <Modal
            isOpen={!!csvPreview}
            onClose={() => setCsvPreview(null)}
            title="Import Preview"
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setCsvPreview(null)} className="si-modal-cancel">
                  Cancel
                </Button>
                <Button onClick={handleBulkImport} className="si-modal-import">
                  <Check size={16} /> Import Units
                </Button>
              </>
            }
          >
            {csvPreview && (
              <div className="si-preview-wrapper">
                <table className="si-preview-table">
                  <thead>
                    <tr className="si-preview-header">
                      {["Invoice #", "Credit Note", "Product", "Category", "Company", "Lot No", "Qty", "Expiry", "Fresh Location", "Returned Location"].map((h) => (
                        <th key={h} className="si-preview-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="si-preview-row">
                        <td className="si-preview-td si-preview-lot">{row.invoiceNumber || row.documentNumber}</td>
                        <td className="si-preview-td si-preview-lot">{row.creditNoteNumber || "—"}</td>
                        <td className="si-preview-td">{row.productName}</td>
                        <td className="si-preview-td"><Badge variant="primary">{row.category || "General"}</Badge></td>
                        <td className="si-preview-td">{row.companyName}</td>
                        <td className="si-preview-td si-preview-lot">{row.lotNo}</td>
                        <td className="si-preview-td">{row.quantity}</td>
                        <td className="si-preview-td">{row.expiryDate}</td>
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