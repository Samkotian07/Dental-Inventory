import { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { toast } from "sonner";
import { useInventory } from "../../context/InventoryContext.jsx";

export default function AddLotModal({ product, onClose, onSaved }) {
  const { receiveStock } = useInventory();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    lotNo: "",
    quantity: "",
    invoiceNo: "",
    creditNoteNo: "",
    expiryDate: "",
  });

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const canSubmit =
    form.lotNo.trim() && Number(form.quantity) >= 1 && !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await receiveStock({
      ref_no: product.refNo,
      lot_no: form.lotNo.trim(),
      quantity: Number(form.quantity),
      invoice_no: form.invoiceNo.trim() || null,
      credit_note_no: form.creditNoteNo.trim() || null,
      expiry_date: form.expiryDate || null,
      product_name: product.productName,
      category: product.category,
      size: product.size,
      company_name: product.companyName,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success(`Added ${form.quantity} unit(s) to ${product.refNo}`);
      onSaved?.();
      onClose?.();
    } else {
      toast.error(result.message || "Failed to add stock");
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Add Stock — ${product.refNo}`} width={520}>
      <div style={{ marginBottom: 12, color: "#64748B", fontSize: 13 }}>
        {product.productName}
      </div>

      <div className="modal__field">
        <label>Lot No *</label>
        <Input value={form.lotNo} onChange={(e) => update("lotNo", e.target.value)} placeholder="e.g. 12265916" />
      </div>

      <div className="modal__field">
        <label>Quantity *</label>
        <Input type="number" min="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
      </div>

      <div className="modal__field">
        <label>Invoice No</label>
        <Input value={form.invoiceNo} onChange={(e) => update("invoiceNo", e.target.value)} placeholder="INV-2026-XXX" />
      </div>

      <div className="modal__field">
        <label>Credit Note No</label>
        <Input value={form.creditNoteNo} onChange={(e) => update("creditNoteNo", e.target.value)} />
      </div>

      <div className="modal__field">
        <label>Expiry Date</label>
        <Input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} />
      </div>

      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSubmit}>
          {submitting ? "Adding..." : "Add Stock"}
        </Button>
      </div>
    </Modal>
  );
}