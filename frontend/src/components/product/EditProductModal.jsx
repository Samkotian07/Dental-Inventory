import { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { toast } from "sonner";
import { useInventory } from "../../context/InventoryContext.jsx";

export default function EditProductModal({ product, onClose, onSaved }) {
  const { updateProduct } = useInventory();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    freshLocation: product.freshLocation || "",
    returnedLocation: product.returnedLocation || "",
    lowStockThreshold: product.lowStockThreshold ?? 10,
  });

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSubmitting(true);
    const result = await updateProduct(product.refNo, {
      fresh_location: form.freshLocation.trim(),
      returned_location: form.returnedLocation.trim(),
      low_stock_threshold: Number(form.lowStockThreshold) || 0,
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
    <Modal isOpen={true} onClose={onClose} title={`Edit ${product.refNo}`} width={500}>
      <div style={{ marginBottom: 12, color: "#64748B", fontSize: 13 }}>
        {product.productName}
      </div>

      <div className="modal__field">
        <label>Fresh Location</label>
        <Input value={form.freshLocation} onChange={(e) => update("freshLocation", e.target.value)} />
      </div>

      <div className="modal__field">
        <label>Returned Location</label>
        <Input value={form.returnedLocation} onChange={(e) => update("returnedLocation", e.target.value)} />
      </div>

      <div className="modal__field">
        <label>Low Stock Threshold</label>
        <Input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => update("lowStockThreshold", e.target.value)} />
      </div>

      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Modal>
  );
}