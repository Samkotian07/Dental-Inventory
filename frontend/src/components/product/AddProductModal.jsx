import { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { toast } from "sonner";
import { useInventory } from "../../context/InventoryContext.jsx";
import "./AddProductModal.css";

const CATEGORIES = ["implant", "abutment", "prosthetic", "tool", "consumable", "other"];

export default function AddProductModal({ onClose, onSaved }) {
  const { createProduct, receiveStock } = useInventory();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    refNo: "",
    groupCode: "",
    productName: "",
    category: "implant",
    companyName: "",
    size: "",
    description: "",
    freshLocation: "",
    returnedLocation: "",
    lowStockThreshold: 10,
    lotNo: "",
    quantity: "",
    invoiceNo: "",
    creditNoteNo: "",
    expiryDate: "",
    isReturnable: false, // implants usually false by default
    isActive: true,
  });

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleCategoryChange = (cat) => {
    setForm((prev) => ({
      ...prev,
      category: cat,
      isReturnable: !["implant", "abutment"].includes(cat),
    }));
  };

  const canSubmit =
    form.refNo.trim() &&
    form.productName.trim() &&
    form.category &&
    form.companyName.trim() &&
    !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    const hasAnyLotValue = [form.lotNo, form.quantity, form.invoiceNo, form.creditNoteNo, form.expiryDate]
      .some((value) => String(value).trim() !== "");
    if (hasAnyLotValue && (!form.lotNo.trim() || Number(form.quantity) < 1)) {
      toast.error("Lot number and quantity are required when adding stock details");
      return;
    }
    setSubmitting(true);
    const result = await createProduct({
      ref_no: form.refNo.trim(),
      group_code: form.groupCode.trim() || undefined,
      product_name: form.productName.trim(),
      category: form.category,
      company_name: form.companyName.trim(),
      size: form.size.trim(),
      description: form.description.trim(),
      fresh_location: form.freshLocation.trim(),
      returned_location: form.returnedLocation.trim(),
      low_stock_threshold: Number(form.lowStockThreshold) || 10,
      is_returnable: form.isReturnable,
      is_active: form.isActive,
    });
    if (result.success && hasAnyLotValue) {
      const stockResult = await receiveStock({
        ref_no: form.refNo.trim(),
        lot_no: form.lotNo.trim(),
        quantity: Number(form.quantity),
        invoice_no: form.invoiceNo.trim() || null,
        credit_note_no: form.creditNoteNo.trim() || null,
        expiry_date: form.expiryDate || null,
        product_name: form.productName.trim(),
        category: form.category,
        size: form.size.trim(),
        company_name: form.companyName.trim(),
      });
      if (!stockResult.success) {
        setSubmitting(false);
        toast.error(stockResult.message || "Product was created, but the opening stock could not be added");
        return;
      }
    }
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
    <Modal isOpen={true} onClose={onClose} title="Add New Product" size="xl">
      <div className="add-product-form">
        <div className="modal__field">
          <label>Invoice No</label>
          <Input value={form.invoiceNo} onChange={(e) => update("invoiceNo", e.target.value)} placeholder="e.g. INV-2026-001" />
        </div>

        <div className="modal__field">
          <label>Credit Note No</label>
          <Input value={form.creditNoteNo} onChange={(e) => update("creditNoteNo", e.target.value)} placeholder="Optional credit note" />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Ref No *</label>
          <Input
            value={form.refNo}
            onChange={(e) => update("refNo", e.target.value)}
            placeholder="e.g. 36704"
          />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Group Code</label>
          <Input
            value={form.groupCode}
            onChange={(e) => update("groupCode", e.target.value)}
            placeholder="Auto-generated if blank (e.g. IMP-36704)"
          />
        </div>

        <div className="modal__field modal__field--product">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Product Name *</label>
          <Input
            value={form.productName}
            onChange={(e) => update("productName", e.target.value)}
            placeholder="e.g. RP Implants CC RP 4.3 x 8mm"
          />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: "13.5px",
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
          <Input
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="e.g. Nobel Replace"
          />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Size</label>
          <Input
            value={form.size}
            onChange={(e) => update("size", e.target.value)}
            placeholder="e.g. 4.3 x 8mm"
          />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Low Stock Threshold</label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.lowStockThreshold}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                update("lowStockThreshold", e.target.value);
              }
            }}
          />
        </div>

        <div className="modal__field">
          <label>Lot No</label>
          <Input value={form.lotNo} onChange={(e) => update("lotNo", e.target.value)} placeholder="e.g. 194032" />
        </div>

        <div className="modal__field">
          <label>Quantity</label>
          <Input type="number" min="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} placeholder="Opening quantity" />
        </div>

        <div className="modal__field">
          <label>Expiry Date</label>
          <Input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Fresh Location</label>
          <Input
            value={form.freshLocation}
            onChange={(e) => update("freshLocation", e.target.value)}
            placeholder="e.g. Shelf-A1"
          />
        </div>

        <div className="modal__field">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Returned Location</label>
          <Input
            value={form.returnedLocation}
            onChange={(e) => update("returnedLocation", e.target.value)}
            placeholder="e.g. Shelf-B2"
          />
        </div>

        <div className="modal__field modal__field--wide">
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Description</label>
          <Input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional product notes or description"
          />
        </div>

        <div className="modal__field modal__field--toggle">
          <input
            type="checkbox"
            id="addReturnable"
            checked={form.isReturnable}
            onChange={(e) => update("isReturnable", e.target.checked)}
          />
          <label htmlFor="addReturnable">Is Returnable</label>
        </div>

        <div className="modal__field modal__field--toggle">
          <input
            type="checkbox"
            id="addActive"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
          />
          <label htmlFor="addActive">Is Active</label>
        </div>
      </div>

      <div className="modal__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
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
