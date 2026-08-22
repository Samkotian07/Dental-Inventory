import { useState, useRef } from "react";
import { Search, PlusCircle, Upload, Check, Package, Download } from "lucide-react";
import Papa from "papaparse";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
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

// CSV Template headers
const CSV_TEMPLATE = [
  "invoiceNumber",
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
  const { inventory, addInventory } = useData();
  const [csvPreview, setCsvPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    invoiceNumber: "",
    category: CATEGORIES[0],
    companyName: "",
    productName: "",
    size: "",
    lotNo: "",
    quantity: "",
    expiryDate: "",
  });

  const handleNewSubmit = () => {
    if (
      !form.invoiceNumber ||
      !form.companyName ||
      !form.productName ||
      !form.lotNo ||
      !form.quantity ||
      !form.expiryDate
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    addInventory(
      {
        ...form,
        refNo: generateId("INV"),
        quantity: Number(form.quantity),
        status: "active",
      },
      user?.name,
    );
    toast.success("New inventory item added successfully");
    setForm({
      invoiceNumber: "",
      category: CATEGORIES[0],
      companyName: "",
      productName: "",
      size: "",
      lotNo: "",
      quantity: "",
      expiryDate: "",
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid = results.data.filter((r) => r.productName && r.lotNo);
        if (valid.length === 0) {
          toast.error("No valid rows found");
          return;
        }
        setCsvPreview(valid);
      },
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleBulkImport = () => {
    csvPreview.forEach((row) => {
      addInventory(
        {
          ...row,
          refNo: row.refNo || generateId("INV"),
          category: row.category || "XYXX",
          quantity: Number(row.quantity) || 0,
          size: row.size || "",
          status: "active",
        },
        user?.name,
      );
    });
    toast.success(`Imported ${csvPreview.length} items successfully`);
    setCsvPreview(null);
  };

  // Download CSV Template
  const downloadTemplate = () => {
    // Create header row
    const headerRow = CSV_TEMPLATE.join(",");
    
    // Create sample data row
    const sampleRow = [
      "INV-2024-001",
      "CONSUMABLES",
      "Dental Supplies Co.",
      "Dental Floss",
      "50m",
      "LOT-2024-001",
      "100",
      "2026-12-31"
    ].join(",");
    
    const csvContent = `${headerRow}\n${sampleRow}`;
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_template.csv";
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
            <h3 className="si-section-title">Add New Inventory Item</h3>
            <div className="si-new-grid">
              <Input
                label="Invoice Number *"
                value={form.invoiceNumber}
                onChange={(e) =>
                  setForm({ ...form, invoiceNumber: e.target.value })
                }
                placeholder="INV-2024-XXX"
                className="si-new-input"
              />
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
                <PlusCircle size={16} /> Add Item
              </Button>
            </div>
          </div>

          {/* Bulk Import Section with Download CSV */}
          <div className="si-bulk-section-wrapper">
            <div className="si-bulk-header">
              <h3 className="si-section-title">Bulk Import Inventory</h3>
              <Button
                variant="secondary"
                onClick={downloadTemplate}
                className="si-download-btn"
              >
                <Download size={16} /> Download CSV Template
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
                    <p className="si-bulk-title">Upload CSV File</p>
                    <p className="si-bulk-desc">
                      Drag & drop a CSV file or click Browse. Required columns:{" "}
                      <span className="si-bulk-columns">
                        invoiceNumber, category, companyName, productName, size, lotNo, quantity, expiryDate
                      </span>
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
                  accept=".csv"
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
                  <Check size={16} /> Import {csvPreview?.length} Items
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