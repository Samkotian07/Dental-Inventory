import { useState, useRef } from "react";
import { Search, PlusCircle, Upload, Check, Package, Download, FileText, FileCheck, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
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

// Excel Template headers
const EXCEL_HEADERS = [
  "documentNumber",
  "category",
  "companyName",
  "productName",
  "size",
  "lotNo",
  "quantity",
  "expiryDate"
];

export default function StockInsertion() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { addStockItem, returns } = useInventory();
  const [csvPreview, setCsvPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [documentType, setDocumentType] = useState("invoice");
  const fileInputRef = useRef(null);

  const completedCreditNotes = (returns || [])
    .filter((r) => r.creditNote)
    .map((r) => r.creditNote);

  const [form, setForm] = useState({
    documentNumber: "",
    category: CATEGORIES[0],
    companyName: "",
    productName: "",
    size: "",
    lotNo: "",
    quantity: "",
    expiryDate: "",
  });

  // ⭐ FIXED: Create individual units for each quantity
  const handleNewSubmit = async () => {
    if (
      !form.documentNumber ||
      !form.companyName ||
      !form.productName ||
      !form.lotNo ||
      !form.quantity ||
      !form.expiryDate
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const totalQty = Number(form.quantity);
    let successCount = 0;

    // ⭐ Create INDIVIDUAL units (1 unit per record)
    for (let i = 0; i < totalQty; i++) {
      const itemData = {
        documentNumber: form.documentNumber,
        category: form.category,
        companyName: form.companyName,
        productName: form.productName,
        size: form.size,
        lotNo: form.lotNo,
        expiryDate: form.expiryDate,
        refNo: generateId("INV"),
        documentType: documentType,
        invoiceNo: documentType === "invoice" ? form.documentNumber : "",
        creditNoteNo: documentType === "creditNote" ? form.documentNumber : "",
        qty: 1,  // ⭐ Always 1
        quantity: 1,  // ⭐ Always 1
        product: form.productName,
        company: form.companyName,
        expiry: form.expiryDate,
        status: "active",
        lot_no: form.lotNo,
      };
      
      const result = await addStockItem(itemData);
      if (result.success) {
        successCount++;
      }
    }

    if (successCount === totalQty) {
      toast.success(`Added ${successCount} individual units successfully with ${documentType === 'invoice' ? 'Invoice' : 'Credit Note'} number`);
      setForm({
        documentNumber: "",
        category: CATEGORIES[0],
        companyName: "",
        productName: "",
        size: "",
        lotNo: "",
        quantity: "",
        expiryDate: "",
      });
    } else {
      toast.warning(`Added ${successCount} of ${totalQty} units. Some failed.`);
    }
  };

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
        if (valid.length === 0) {
          toast.error("No valid rows found");
          return;
        }
        setCsvPreview(valid);
      } catch (error) {
        toast.error("Error reading file. Please check the format.");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ⭐ FIXED: Bulk import - create individual units
  const handleBulkImport = () => {
    let totalImported = 0;
    
    csvPreview.forEach((row) => {
      const qty = Number(row.quantity) || 1;
      
      // Create INDIVIDUAL units
      for (let i = 0; i < qty; i++) {
        const itemData = {
          ...row,
          refNo: generateId("INV"),
          documentType: documentType,
          category: row.category || "General",
          qty: 1,
          quantity: 1,
          product: row.productName || row.product || "Dental Item",
          company: row.companyName || row.company || "Vendor",
          expiry: row.expiryDate || row.expiry || "",
          size: row.size || "",
          status: "active",
          lot_no: row.lotNo,
        };
        addStockItem(itemData);
        totalImported++;
      }
    });
    
    toast.success(`Imported ${totalImported} individual units successfully`);
    setCsvPreview(null);
  };

  // Download Excel Template
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        documentNumber: "",
        category: "",
        companyName: "",
        productName: "",
        size: "",
        lotNo: "",
        quantity: "",
        expiryDate: ""
      }
    ]);

    const colWidths = [
      { wch: 18 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
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
              <div className="si-doc-type-toggle">
                <button
                  onClick={() => setDocumentType("invoice")}
                  className={`si-doc-btn ${documentType === "invoice" ? "si-doc-active" : "si-doc-inactive"}`}
                >
                  <FileText size={16} />
                  Invoice
                </button>
                <button
                  onClick={() => setDocumentType("creditNote")}
                  className={`si-doc-btn ${documentType === "creditNote" ? "si-doc-active" : "si-doc-inactive"}`}
                >
                  <FileCheck size={16} />
                  Credit Note
                </button>
              </div>
            </div>

            <div className="si-new-grid">
              <div className="si-new-field">
                <label className="si-new-label">
                  {documentType === "invoice" ? "Invoice Number *" : "Credit Note Number *"}
                </label>
                {documentType === "creditNote" && completedCreditNotes.length > 0 ? (
                  <select
                    className="si-new-select"
                    value={form.documentNumber}
                    onChange={(e) => {
                      const cnVal = e.target.value;
                      const matching = (returns || []).find((r) => r.creditNote === cnVal);
                      if (matching) {
                        setForm((prev) => ({
                          ...prev,
                          documentNumber: cnVal,
                          productName: matching.productName || matching.product || prev.productName,
                          companyName: matching.companyName || matching.company || prev.companyName,
                          category: matching.category || prev.category,
                          lotNo: matching.oldBatchNo || matching.batchNo || prev.lotNo,
                        }));
                      } else {
                        setForm((prev) => ({ ...prev, documentNumber: cnVal }));
                      }
                    }}
                  >
                    <option value="">Select available Credit Note...</option>
                    {completedCreditNotes.map((cn) => (
                      <option key={cn} value={cn}>
                        {cn}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={form.documentNumber}
                    onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                    placeholder={documentType === "invoice" ? "INV-2024-XXX" : "CN-2024-XXX"}
                    className="si-new-input"
                  />
                )}
              </div>
              <div className="si-new-field">
                <label className="si-new-label">Category *</label>
                <select
                  className="si-new-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Company Name *"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                className="si-new-input"
              />
              <Input
                label="Product Name *"
                value={form.productName}
                onChange={(e) =>
                  setForm({ ...form, productName: e.target.value })
                }
                className="si-new-input"
              />
              <Input
                label="Size"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="si-new-input"
              />
              <Input
                label="Lot No *"
                value={form.lotNo}
                onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
                className="si-new-input"
              />
              <Input
                label="Quantity *"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="si-new-input"
              />
              <Input
                label="Expiry Date *"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="si-new-input"
              />
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
              <Button
                variant="secondary"
                onClick={downloadTemplate}
                className="si-download-btn"
              >
                <Download size={16} /> Download Template
              </Button>
            </div>

            <div
              className={`si-bulk-section ${isDragging ? "si-bulk-dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="si-bulk-content">
                <div className="si-bulk-left">
                  <div className="si-bulk-icon">
                    <Upload size={22} />
                  </div>
                  <div>
                    <p className="si-bulk-title">Upload Excel File</p>
                    <p className="si-bulk-desc">
                      Drag & drop an Excel file (.xlsx) or click Browse.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="si-browse-btn"
                >
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
                <Button
                  variant="secondary"
                  onClick={() => setCsvPreview(null)}
                  className="si-modal-cancel"
                >
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
                      {[
                        "Document Number",
                        "Product",
                        "Category",
                        "Company",
                        "Lot No",
                        "Qty",
                        "Expiry",
                      ].map((h) => (
                        <th key={h} className="si-preview-th">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="si-preview-row">
                        <td className="si-preview-td si-preview-lot">{row.documentNumber}</td>
                        <td className="si-preview-td">{row.productName}</td>
                        <td className="si-preview-td">
                          <Badge variant="primary">{row.category || "XYXX"}</Badge>
                        </td>
                        <td className="si-preview-td">{row.companyName}</td>
                        <td className="si-preview-td si-preview-lot">
                          {row.lotNo}
                        </td>
                        <td className="si-preview-td">{row.quantity}</td>
                        <td className="si-preview-td">{row.expiryDate}</td>
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