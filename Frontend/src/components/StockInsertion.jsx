import { useState, useRef } from "react";
import { Search, PlusCircle, Upload, Check, Package } from "lucide-react";
import Papa from "papaparse";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";
import Input from "./common/Input";
import Badge from "./common/Badge";
import Modal from "./common/Modal";
import { CATEGORIES } from "./utils/constants";
import { generateId } from "./utils/helpers";
import { toast } from "sonner";
import "./StockInsertion.css";

export default function StockInsertion() {
  const { user } = useAuth();
  const { inventory, addInventory } = useData();
  const [mode, setMode] = useState("new");
  const [searchRef, setSearchRef] = useState("");
  const [foundItem, setFoundItem] = useState(null);
  const [addQty, setAddQty] = useState(0);
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

  const handleSearch = () => {
    const item = inventory.find(
      (i) => i.refNo.toLowerCase() === searchRef.toLowerCase(),
    );
    if (item) {
      setFoundItem(item);
      setAddQty(0);
    } else {
      setFoundItem(null);
      toast.error("No item found with that Ref No");
    }
  };

  const handleUpdateQty = () => {
    if (addQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    const newQty = foundItem.quantity + Number(addQty);
    addInventory(
      {
        ...foundItem,
        refNo: foundItem.refNo,
        invoiceNumber: foundItem.invoiceNumber,
        quantity: newQty,
      },
      user?.name,
    );
    toast.success(`Added ${addQty} units. New total: ${newQty}`);
    setFoundItem(null);
    setSearchRef("");
    setAddQty(0);
  };

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
        },
        user?.name,
      );
    });
    toast.success(`Imported ${csvPreview.length} items successfully`);
    setCsvPreview(null);
  };

  return (
    <div className="si-container">
      {/* Mode toggle */}
      <div className="si-mode-toggle">
        <button
          onClick={() => setMode("new")}
          className={`si-mode-btn ${mode === "new" ? "si-mode-active" : "si-mode-inactive"}`}
        >
          New Item
        </button>
        <button
          onClick={() => setMode("update")}
          className={`si-mode-btn ${mode === "update" ? "si-mode-active" : "si-mode-inactive"}`}
        >
          Update Existing
        </button>
      </div>

      {mode === "update" && (
        <div className="si-search-section">
          <h3 className="si-section-title">Search Existing Item</h3>
          <div className="si-search-controls">
            <div className="si-search-input-wrapper">
              <Search size={18} className="si-search-icon" />
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter Ref No (e.g. INV-001)"
                className="si-search-input"
              />
            </div>
            <Button onClick={handleSearch} className="si-search-btn">
              Search
            </Button>
          </div>

          {foundItem && (
            <div className="si-found-item">
              <div className="si-found-item-header">
                <div className="si-found-item-icon">
                  <Package size={18} />
                </div>
                <div>
                  <p className="si-found-item-name">{foundItem.productName}</p>
                  <p className="si-found-item-details">
                    {foundItem.refNo} - Current Qty: {foundItem.quantity}
                  </p>
                </div>
              </div>
              <div className="si-found-item-actions">
                <Input
                  label="Add Quantity"
                  type="number"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="si-add-qty-input"
                />
                <Button
                  onClick={handleUpdateQty}
                  className="si-update-stock-btn"
                >
                  Update Stock
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "new" && (
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
      )}

      {/* Bulk Import */}
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
              <p className="si-bulk-title">Bulk Import Inventory</p>
              <p className="si-bulk-desc">
                Drag & drop a CSV file. Columns: invoiceNumber, category,
                companyName, productName, size, lotNo, quantity, expiryDate
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

      {/* CSV Preview Modal */}
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
  );
}
