import { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { toast } from "sonner";
import { useInventory } from "../../context/InventoryContext.jsx";

const CATEGORIES = ["implant", "abutment", "prosthetic", "tool", "consumable", "other"];

export default function AddProductModal({ onClose, onSaved }) {
  const { createProduct } = useInventory();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    refNo: "",
    productName: "",
    category: "implant",
    companyName: "",
    size: "",
    freshLocation: "",
    returnedLocation: "",
    lowStockThreshold: 10,
  });

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const canSubmit =
    form.refNo.trim() &&
    form.productName.trim() &&
    form.category &&
    form.companyName.trim() &&
    !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await createProduct({
      ref_no: form.refNo.trim(),
      product_name: form.productName.trim(),
      category: form.category,
      company_name: form.companyName.trim(),
      size: form.size.trim(),
      fresh_location: form.freshLocation.trim(),
      returned_location: form.returnedLocation.trim(),
      low_stock_threshold: Number(form.lowStockThreshold) || 10,
    });
    setSubmitting(false);

    if (result.success) {
      toast.success(`Product ${form.refNo} created`);
      onSaved?.();
      onClose?.();
    } else {
      toast.error(result.message || "Failed to create product");
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Product" width={560}>
      <div className="modal__field">
        <label>Ref No *</label>
        <Input
          value={form.refNo}
          onChange={(e) => update("refNo", e.target.value)}
          placeholder="e.g. 36704"
        />
      </div>

      <div className="modal__field">
        <label>Product Name *</label>
        <Input
          value={form.productName}
          onChange={(e) => update("productName", e.target.value)}
          placeholder="e.g. RP Implants CC RP 4.3 x 8mm"
        />
      </div>

      <div className="modal__field">
        <label>Category *</label>
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: "14px",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label>Company Name *</label>
        <Input
          value={form.companyName}
          onChange={(e) => update("companyName", e.target.value)}
          placeholder="e.g. Nobel Replace"
        />
      </div>

      <div className="modal__field">
        <label>Size</label>
        <Input
          value={form.size}
          onChange={(e) => update("size", e.target.value)}
          placeholder="e.g. 4.3 x 8mm"
        />
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div className="modal__field" style={{ flex: 1 }}>
          <label>Fresh Location</label>
          <Input
            value={form.freshLocation}
            onChange={(e) => update("freshLocation", e.target.value)}
            placeholder="Shelf-A1"
          />
        </div>
        <div className="modal__field" style={{ flex: 1 }}>
          <label>Returned Location</label>
          <Input
            value={form.returnedLocation}
            onChange={(e) => update("returnedLocation", e.target.value)}
            placeholder="Shelf-B2"
          />
        </div>
      </div>

      <div className="modal__field">
        <label>Low Stock Threshold</label>
        <Input
          type="number"
          min="0"
          value={form.lowStockThreshold}
          onChange={(e) => update("lowStockThreshold", e.target.value)}
        />
      </div>

      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSubmit}>
          {submitting ? "Saving..." : "Create Product"}
        </Button>
      </div>
    </Modal>
  );
}