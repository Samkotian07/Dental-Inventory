import { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { toast } from "sonner";
import { useInventory } from "../../context/InventoryContext.jsx";

const CATEGORIES = ["implant", "abutment", "prosthetic", "tool", "consumable", "other"];

export default function EditProductModal({ product, onClose, onSaved }) {
  const { updateProduct } = useInventory();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    groupCode: product.groupCode || "",
    productName: product.productName || product.product || "",
    category: (product.category || "implant").toLowerCase(),
    companyName: product.company || product.companyName || "",
    size: product.size || "",
    description: product.description || "",
    freshLocation: product.freshLocation || "",
    returnedLocation: product.returnedLocation || "",
    lowStockThreshold: product.lowStockThreshold ?? 10,
    isReturnable: product.isReturnable !== false,
    isActive: product.isActive !== false,
  });

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSubmitting(true);
    const result = await updateProduct(product.refNo, {
      group_code: form.groupCode.trim(),
      product_name: form.productName.trim(),
      category: form.category,
      company_name: form.companyName.trim(),
      size: form.size.trim(),
      description: form.description.trim(),
      fresh_location: form.freshLocation.trim(),
      returned_location: form.returnedLocation.trim(),
      low_stock_threshold: Number(form.lowStockThreshold) || 0,
      is_returnable: form.isReturnable,
      is_active: form.isActive,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success(`Updated ${product.refNo}`);
      onSaved?.();
      onClose?.();
    } else {
      toast.error(result.message || "Failed to update product");
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Product — ${product.refNo}`} width={600}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Ref No</label>
          <Input value={product.refNo} disabled style={{ background: "var(--accent-soft, #f4f4f5)", cursor: "not-allowed" }} />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Group Code</label>
          <Input value={form.groupCode} onChange={(e) => update("groupCode", e.target.value)} placeholder="e.g. IMP-1901" />
        </div>

        <div className="modal__field" style={{ gridColumn: "span 2" }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Product Name *</label>
          <Input value={form.productName} onChange={(e) => update("productName", e.target.value)} />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line, #E2E8F0)",
              borderRadius: "8px",
              background: "var(--surface, #FFF)",
              fontSize: 13.5,
              textTransform: "capitalize",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Company / Vendor *</label>
          <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Size</label>
          <Input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="e.g. 4.2x10mm" />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Low Stock Threshold</label>
          <Input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => update("lowStockThreshold", e.target.value)} />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Fresh Location</label>
          <Input value={form.freshLocation} onChange={(e) => update("freshLocation", e.target.value)} />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Returned Location</label>
          <Input value={form.returnedLocation} onChange={(e) => update("returnedLocation", e.target.value)} />
        </div>

        <div className="modal__field" style={{ gridColumn: "span 2" }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Description</label>
          <Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional product description" />
        </div>

        <div className="modal__field" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <input
            type="checkbox"
            id="editReturnable"
            checked={form.isReturnable}
            onChange={(e) => update("isReturnable", e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <label htmlFor="editReturnable" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Is Returnable</label>
        </div>

        <div className="modal__field" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <input
            type="checkbox"
            id="editActive"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <label htmlFor="editActive" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Is Active</label>
        </div>
      </div>

      <div className="modal__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Modal>
  );
}