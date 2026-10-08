import { useState, useMemo, useRef } from "react";
import { Plus, Upload, Download, Search, Edit, PackagePlus, Check, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import AddProductModal from "../components/product/AddProductModal.jsx";
import AddLotModal from "../components/product/AddLotModal.jsx";
import EditProductModal from "../components/product/EditProductModal.jsx";
import { toast } from "sonner";
import "./css/ProductCatalog.css";

const PAGE_SIZE = 10;

const BULK_COLUMNS = [
  "refNo", "category", "companyName", "productName", "size",
  "freshLocation", "returnedLocation",
  "lotNo", "quantity", "invoiceNo", "creditNoteNo", "expiryDate",
];

export default function ProductCatalog() {
  const onMenuClick = useMenuClick();
  const { stock, createProduct, bulkCreateProducts, receiveStock } = useInventory();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [lotProduct, setLotProduct] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stock || [];
    return (stock || []).filter(
      (s) =>
        (s.refNo || "").toLowerCase().includes(q) ||
        (s.product || s.productName || "").toLowerCase().includes(q) ||
        (s.company || s.companyName || "").toLowerCase().includes(q)
    );
  }, [stock, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ---------- Bulk Upload ----------
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        refNo: "", category: "", companyName: "", productName: "", size: "",
        freshLocation: "", returnedLocation: "",
        lotNo: "", quantity: "", invoiceNo: "", creditNoteNo: "", expiryDate: "",
      },
    ]);
    ws["!cols"] = BULK_COLUMNS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_catalog_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const validated = json.map((row) => {
          const errors = [];
          if (!row.refNo) errors.push("Missing refNo");
          if (!row.productName) errors.push("Missing productName");
          const hasLot = row.lotNo && row.quantity;
          if (row.lotNo && !row.quantity) errors.push("lotNo without quantity");
          if (row.quantity && !row.lotNo) errors.push("quantity without lotNo");
          return { ...row, _errors: errors, _hasLot: !!hasLot };
        });

        setBulkPreview(validated);
        const valid = validated.filter((r) => r._errors.length === 0).length;
        toast.success(`Loaded ${valid} valid rows of ${validated.length}`);
      } catch {
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

  const handleBulkImport = async () => {
    const valid = bulkPreview.filter((r) => r._errors.length === 0);
    if (!valid.length) {
      toast.error("No valid rows");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    const errors = [];

    for (const row of valid) {
      // 1. Create the product
      const prodRes = await createProduct({
        ref_no: row.refNo,
        product_name: row.productName,
        category: row.category || "other",
        company_name: row.companyName || "Unknown",
        size: row.size || "",
        fresh_location: row.freshLocation || "",
        returned_location: row.returnedLocation || "",
        low_stock_threshold: 10,
      });

      if (!prodRes.success && !String(prodRes.message || "").toLowerCase().includes("exists")) {
        errors.push({ refNo: row.refNo, error: prodRes.message });
        continue;
      }

      // 2. If lot fields present, add stock
      if (row._hasLot) {
        const lotRes = await receiveStock({
          ref_no: row.refNo,
          lot_no: row.lotNo,
          quantity: Number(row.quantity),
          invoice_no: row.invoiceNo || null,
          credit_note_no: row.creditNoteNo || null,
          expiry_date: row.expiryDate || null,
          product_name: row.productName,
          category: row.category,
          size: row.size,
          company_name: row.companyName,
        });
        if (!lotRes.success) {
          errors.push({ refNo: row.refNo, error: lotRes.message });
          continue;
        }
      }

      successCount++;
    }

    setIsSubmitting(false);
    setBulkPreview(null);

    if (errors.length === 0) {
      toast.success(`Imported ${successCount} product(s)`);
    } else {
      toast.warning(`Imported ${successCount}, failed ${errors.length}. Check console.`);
      console.warn("Bulk errors:", errors);
    }
  };

  const validCount = bulkPreview ? bulkPreview.filter((r) => r._errors.length === 0).length : 0;
  const invalidCount = bulkPreview ? bulkPreview.filter((r) => r._errors.length > 0).length : 0;

  return (
    <>
      <DashboardHeader title="Product Catalog" onMenuClick={onMenuClick} />

      <main className="stock">
        <div className="stock__toolbar">
          <div className="stock__filters">
            <div className="stock__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by ref, product, or company..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="stock__actions">
            <button className="stock__btn" onClick={downloadTemplate}>
              <Download size={15} /> Template
            </button>
            <button className="stock__btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} /> Bulk Upload
            </button>
            <button className="stock__btn stock__btn--primary" onClick={() => setAddOpen(true)}>
              <Plus size={15} /> Add Product
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        </div>

        <section className="card stock__card">
          <div className="stock__scroll">
            <table className="stock__table">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Company</th>
                  <th>Size</th>
                  <th>Fresh Loc</th>
                  <th>Returned Loc</th>
                  <th className="stock__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="stock__empty">
                      No products found.
                    </td>
                  </tr>
                )}
                {pageRows.map((row) => (
                  <tr key={row.refNo}>
                    <td className="stock__mono">{row.refNo}</td>
                    <td className="stock__strong">{row.product || row.productName}</td>
                    <td>
                      <span className={`stock-tag stock-tag--${(row.category || "general").toLowerCase()}`}>
                        {row.category || "—"}
                      </span>
                    </td>
                    <td>{row.company || row.companyName}</td>
                    <td>{row.size || "—"}</td>
                    <td className="stock__mono">{row.freshLocation || "—"}</td>
                    <td className="stock__mono">{row.returnedLocation || "—"}</td>
                    <td>
                      <div className="stock__row-actions">
                        <button
                          className="stock__icon-btn"
                          title="Add Stock Lot"
                          onClick={() => setLotProduct(row)}
                        >
                          <PackagePlus size={16} />
                        </button>
                        <button
                          className="stock__icon-btn"
                          title="Edit"
                          onClick={() => setEditProduct(row)}
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>

        <div
          className={`catalog-bulk-dropzone ${isDragging ? "is-dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={22} className="catalog-bulk-dropzone__icon" />
          <p className="catalog-bulk-dropzone__title">Drop Excel here or use Bulk Upload button</p>
          <p className="catalog-bulk-dropzone__sub">
            Columns: {BULK_COLUMNS.join(", ")}
          </p>
        </div>
      </main>

      {addOpen && (
        <AddProductModal onClose={() => setAddOpen(false)} onSaved={() => {}} />
      )}

      {lotProduct && (
        <AddLotModal product={lotProduct} onClose={() => setLotProduct(null)} onSaved={() => {}} />
      )}

      {editProduct && (
        <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} onSaved={() => {}} />
      )}

      {bulkPreview && (
        <Modal
          isOpen={true}
          onClose={() => setBulkPreview(null)}
          title={`Bulk Preview — ${validCount} valid, ${invalidCount} invalid`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setBulkPreview(null)}>Cancel</Button>
              <Button onClick={handleBulkImport} disabled={isSubmitting || validCount === 0}>
                <Check size={16} /> {isSubmitting ? "Importing..." : `Import ${validCount}`}
              </Button>
            </>
          }
        >
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Company</th>
                  <th>Lot No</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreview.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: 6 }}>
                      {r._errors.length === 0
                        ? <Check size={14} color="#059669" />
                        : <XCircle size={14} color="#DC2626" title={r._errors.join(", ")} />}
                    </td>
                    <td style={{ padding: 6 }}>{r.refNo}</td>
                    <td style={{ padding: 6 }}>{r.productName}</td>
                    <td style={{ padding: 6 }}>{r.category}</td>
                    <td style={{ padding: 6 }}>{r.companyName}</td>
                    <td style={{ padding: 6 }}>{r.lotNo || "—"}</td>
                    <td style={{ padding: 6 }}>{r.quantity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}