import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import QRCode from "react-qr-code";
import { useInventory } from "../../context/InventoryContext.jsx";
import { toast } from "sonner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReturnItemModal({ 
  item, 
  onClose, 
  onConfirm, 
  onCondemn, 
  onExchange 
}) {
  const { stock = [], issuedItems = [] } = useInventory();
  
  const [returnDate, setReturnDate] = useState(todayISO());
  const [step, setStep] = useState("confirm");
  const [actionType, setActionType] = useState("return");
  const [condemnReason, setCondemnReason] = useState("");
  const [exchangeReason, setExchangeReason] = useState("Damaged");
  const [isProcessing, setIsProcessing] = useState(false);

  // ⭐ Detect if this is an implant/abutment
  const isImplantAbutment = useMemo(() => {
    const flag = item?.isImplantAbutment || item?.is_implant_abutment || false;
    const category = item?.category || "";
    const isImplantCategory = category.toLowerCase() === 'implant';
    const isAbutmentCategory = category.toLowerCase() === 'abutment';
    return flag || isImplantCategory || isAbutmentCategory;
  }, [item]);

  // Match item in stock to get location
  const stockMatch = useMemo(() => {
    if (!item) return null;
    return stock.find((s) => s.id === item.inventoryId || s.unitId === item.unitId);
  }, [stock, item]);

  const location = useMemo(() => {
    return stockMatch?.freshLocation || stockMatch?.location || "—";
  }, [stockMatch]);

  const expiryDate = useMemo(() => {
    return item?.expiry || item?.expiryDate || stockMatch?.expiry || stockMatch?.expiryDate || "—";
  }, [item, stockMatch]);

  // ⭐ Generate QR URL - Use unit_id if available, fallback to ref_no
  const unitId = item?.unitId || item?.inventoryId || "";
  const qrUnitId = unitId || item?.refNo || "";
  const scanUrl = `${window.location.origin}/unit-history/${encodeURIComponent(qrUnitId)}`;

  const unitHistory = useMemo(() => {
    const list = (issuedItems || [])
      .filter(i => (qrUnitId && i.unitId === qrUnitId) || (item?.unitId && i.unitId === item?.unitId) || (item?.issueId && i.issueId === item?.issueId))
      .sort((a, b) => new Date(a.issueDate || a.date || 0) - new Date(b.issueDate || b.date || 0));
    if (list.length === 0 && item) {
      return [{
        issueId: item.issueId || item.id,
        student: item.student || item.studentName,
        issueDate: item.date || item.issuedDate,
        returnDate: null,
      }];
    }
    return list;
  }, [issuedItems, qrUnitId, item]);

  // PRINT STICKER FUNCTION
  const handlePrint = () => {
    const batchVal = item.lotNo || item.batchNo || "—";
    const productName = item.product || item.productName || "Product";

    let qrSvgHtml = "";
    const qrContainerEl = document.getElementById("modal-qr-container");
    if (qrContainerEl) {
      const svgEl = qrContainerEl.querySelector("svg");
      if (svgEl) {
        qrSvgHtml = new XMLSerializer().serializeToString(svgEl);
      }
    }

    const printWindow = window.open("", "_blank", "width=520,height=680");
    if (!printWindow) {
      alert("Pop-up blocked! Please allow pop-ups for this site to print.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PRINT STICKER - ${productName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; background: white; color: #1F2937; }
              .sticker { width: 100%; max-width: 380px; margin: 0 auto; border: 2px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 24px;
              background: #F8FAFC;
              color: #1F2937;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
            }
            .sticker { 
              width: 100%;
              max-width: 380px;
              margin: 0 auto;
              border: 2px solid #E5E7EB;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              background: white;
              box-shadow: 0 4px 14px rgba(0,0,0,0.06);
            }
            .header {
              font-size: 11px;
              letter-spacing: 1.5px;
              color: #6B7280;
              font-weight: bold;
              margin-bottom: 12px;
            }
            .qr-box { 
              display: inline-block; 
              background: #F9FAFB; 
              padding: 12px; 
              border-radius: 10px; 
              border: 1px solid #E5E7EB;
              margin-bottom: 12px;
            }
            .qr-box svg {
              width: 160px;
              height: 160px;
              display: block;
            }
            .product-name { 
              font-size: 15px; 
              font-weight: bold;
              color: #111827;
              margin: 6px 0;
            }
            .batch-info {
              font-size: 12.5px;
              color: #4B5563;
              margin-bottom: 10px;
            }
            .badge {
              display: inline-block;
              padding: 4px 14px;
              border-radius: 20px;
              font-size: 12.5px;
              font-weight: bold;
              background: #D1FAE5;
              color: #059669;
              margin-bottom: 10px;
            }
            .detail-line {
              font-size: 12.5px;
              color: #4B5563;
              margin: 4px 0;
            }
            .scan-note {
              margin-top: 14px;
              padding: 8px 12px;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 6px;
              font-size: 11.5px;
              font-weight: 600;
              color: #64748B;
            }
          </style>
        </head>
        <body>
          <div class="sticker">
            <div class="header">Dental Inventry — RETURN STICKER</div>
            <div class="qr-box">${qrSvgHtml}</div>
            <br/>
            <div class="badge">✅ RETURNED</div>
            <div class="product-name">Product: ${productName} (Unit: ${qrUnitId})</div>
            <div class="batch-info">
              <strong>Batch:</strong> ${batchVal} | <strong>Expiry Date:</strong> ${expiryDate}
            </div>
            <div class="detail-line">
              Last Student: ${item.student || item.studentName || "Student"} | Returned: ${returnDate}
            </div>
            <div class="detail-line">
              <strong>Restock Location:</strong> ${location}
            </div>
            <div class="scan-note">
              📱 Scan QR code to view complete unit history
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.focus();
              window.print();
            }, 300);
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================================
  // ⭐ STEP 1: CONFIRM ACTION
  // ============================================================
  if (step === "confirm") {
    return (
      <Modal title={isImplantAbutment ? "Exchange with Vendor" : "Return / Condemn Item"} onClose={onClose} width={500}>
        <p className="modal__lead">
          Processing <strong>{item.product || item.productName}</strong> 
          {item.unitId && ` (Unit: ${item.unitId})`} from{" "}
          <strong>{item.student || item.studentName}</strong>.
        </p>

        {isImplantAbutment && (
          <div style={{
            padding: "12px 16px",
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: "8px",
            marginBottom: "16px",
          }}>
            <p style={{ margin: 0, color: "#92400E", fontSize: "14px", fontWeight: "600" }}>
              ⚠️ This is an <strong>Implant or Abutment</strong>
            </p>
            <p style={{ margin: "4px 0 0", color: "#92400E", fontSize: "13px" }}>
              This item cannot be returned to stock. Only <strong>Exchange with Vendor</strong> is available.
            </p>
          </div>
        )}

        <div className="modal__field">
          <label>Select Action</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>

            {!isImplantAbutment && (
              <button
                type="button"
                onClick={() => setActionType("return")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  textAlign: "left",
                  border: actionType === "return" ? "2px solid #059669" : "1px solid #D1D5DB",
                  background: actionType === "return" ? "#D1FAE5" : "white",
                  fontWeight: actionType === "return" ? "600" : "400",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: actionType === "return" ? "#059669" : "#374151",
                }}
              >
                ✅ Return to Stock
              </button>
            )}

            {isImplantAbutment && (
              <button
                type="button"
                onClick={() => setActionType("exchange")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  textAlign: "left",
                  border: actionType === "exchange" ? "2px solid #D97706" : "1px solid #D1D5DB",
                  background: actionType === "exchange" ? "#FEF3C7" : "white",
                  fontWeight: actionType === "exchange" ? "600" : "400",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: actionType === "exchange" ? "#D97706" : "#374151",
                }}
              >
                🔄 Exchange with Vendor (Only Option)
              </button>
            )}

            {!isImplantAbutment && (
              <button
                type="button"
                onClick={() => setActionType("condemn")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  textAlign: "left",
                  border: actionType === "condemn" ? "2px solid #DC2626" : "1px solid #D1D5DB",
                  background: actionType === "condemn" ? "#FEE2E2" : "white",
                  fontWeight: actionType === "condemn" ? "600" : "400",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: actionType === "condemn" ? "#DC2626" : "#374151",
                }}
              >
                🗑️ Condemn (Discard)
              </button>
            )}
          </div>
        </div>

        <div className="modal__field">
          <label htmlFor="return-date">
            {actionType === "condemn" ? "Condemn Date" : actionType === "exchange" ? "Exchange Date" : "Return Date"}
          </label>
          <input
            id="return-date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        {actionType === "exchange" && isImplantAbutment && (
          <div className="modal__field">
            <label htmlFor="exchange-reason">Exchange Reason *</label>
            <select
              id="exchange-reason"
              value={exchangeReason}
              onChange={(e) => setExchangeReason(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="Defective">Defective</option>
              <option value="Damaged">Damaged</option>
              <option value="Expired">Expired</option>
              <option value="Failed in Patient">Failed in Patient</option>
              <option value="Other">Other</option>
            </select>
            {exchangeReason === "Other" && (
              <input
                type="text"
                placeholder="Please specify reason..."
                value={exchangeReason}
                onChange={(e) => setExchangeReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  marginTop: "8px",
                }}
              />
            )}
          </div>
        )}

        {actionType === "condemn" && (
          <div className="modal__field">
            <label htmlFor="condemn-reason">Condemn Reason *</label>
            <select
              id="condemn-reason"
              value={condemnReason}
              onChange={(e) => setCondemnReason(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="">Select a reason...</option>
              <option value="Damaged">Damaged</option>
              <option value="Expired">Expired</option>
              <option value="Quality Failed">Quality Failed</option>
              <option value="Other">Other</option>
            </select>
            {condemnReason === "Other" && (
              <input
                type="text"
                placeholder="Please specify reason..."
                value={condemnReason}
                onChange={(e) => setCondemnReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  marginTop: "8px",
                }}
              />
            )}
          </div>
        )}

        {actionType === "return" && !isImplantAbutment && (
          <p style={{ fontSize: "13px", color: "#059669", marginTop: "8px" }}>
            ✅ This will generate a QR code and add the item back to inventory.
          </p>
        )}
        {actionType === "exchange" && isImplantAbutment && (
          <p style={{ fontSize: "13px", color: "#D97706", marginTop: "8px" }}>
            🔄 This will mark the implant/abutment as exchanged with vendor.
          </p>
        )}
        {actionType === "condemn" && !isImplantAbutment && (
          <p style={{ fontSize: "13px", color: "#DC2626", marginTop: "8px" }}>
            ⚠️ This will remove the item from inventory. This cannot be undone.
          </p>
        )}

        <div className="modal__actions">
          <button className="modal__btn" onClick={onClose}>Cancel</button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={() => {
              if (actionType === "return") {
                setStep("qr");
              } else if (actionType === "exchange" && isImplantAbutment) {
                setIsProcessing(true);
                onExchange?.(item.issueId, returnDate, exchangeReason);
                setIsProcessing(false);
                onClose();
              } else if (actionType === "condemn") {
                if (!condemnReason) {
                  alert("Please select a condemn reason");
                  return;
                }
                onCondemn?.(item.issueId, returnDate, condemnReason);
                onClose();
              }
            }}
            disabled={
              (actionType === "condemn" && !condemnReason) ||
              (actionType === "return" && isImplantAbutment) ||
              isProcessing
            }
          >
            {isProcessing 
              ? "Processing..." 
              : actionType === "condemn" 
                ? "Confirm Condemn" 
                : actionType === "exchange" 
                  ? "Send to Vendor" 
                  : "Generate QR & Confirm Return"}
          </button>
        </div>
      </Modal>
    );
  }

  // ============================================================
  // ⭐ STEP 2: QR DISPLAY
  // ============================================================
  if (step === "qr") {
    const productName = item.product || item.productName || "Product";
    const batchVal = item.lotNo || item.batchNo || "—";

    return (
      <Modal title="QR Code Generated - Print Sticker" onClose={onClose} width={640}>
        <div style={{ padding: "10px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
              padding: "18px 22px",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              marginBottom: "20px",
            }}
          >
            <div
              id="modal-qr-container"
              style={{
                background: "white",
                padding: "12px",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                border: "1px solid #E2E8F0",
                display: "inline-block",
              }}
            >
              <QRCode value={scanUrl} size={140} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  borderRadius: "20px",
                  fontSize: "12.5px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  background: "#D1FAE5",
                  color: "#059669",
                }}
              >
                ✅ READY TO RETURN
              </div>
              <h4 style={{ margin: "4px 0", fontSize: "16px", color: "#0F172A", fontWeight: "700" }}>
                Product: {productName} (Unit: {qrUnitId})
              </h4>
              <p style={{ margin: "4px 0", fontSize: "13.5px", color: "#475569" }}>
                <strong>Batch:</strong> {batchVal} | <strong>Expiry Date:</strong> {expiryDate}
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#64748B" }}>
                Last Student: {item.student || item.studentName} | Returned: {returnDate}
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#64748B" }}>
                <strong>Restock Location:</strong> {location}
              </p>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#1E293B", fontWeight: "700" }}>
              📋 Unit History
            </h4>
            <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    <th style={{ padding: "9px 12px", textAlign: "center", width: "55px" }}>Cycle</th>
                    <th style={{ padding: "9px 12px", textAlign: "left" }}>Student</th>
                    <th style={{ padding: "9px 12px", textAlign: "left" }}>Issued</th>
                    <th style={{ padding: "9px 12px", textAlign: "left" }}>Returned</th>
                    <th style={{ padding: "9px 12px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unitHistory.map((h, index) => {
                    const isReturned = h.status === "Returned" || Boolean(h.returnDate);
                    return (
                      <tr key={h.issueId || index} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: "600", fontFamily: "monospace" }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: "9px 12px", fontWeight: "500", color: "#1E293B" }}>
                          {h.student || h.studentName}
                        </td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>
                          {h.issueDate || h.date || "—"}
                        </td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>
                          {h.returnDate || (h.issueId === item?.issueId ? `${returnDate} (Will be updated)` : "—")}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: isReturned ? "#D1FAE5" : "#FEF3C7",
                              color: isReturned ? "#059669" : "#D97706",
                              display: "inline-block",
                            }}
                          >
                            {isReturned ? "✅ Returned" : "🔄 Returning"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#334155",
                textAlign: "center",
              }}
            >
              Summary: {unitHistory.length} {unitHistory.length === 1 ? "cycle" : "cycles"}
            </div>
          </div>
        </div>

        <div className="modal__actions" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button className="modal__btn" onClick={() => setStep("confirm")}>
            Back
          </button>
          <button className="modal__btn modal__btn--primary" onClick={handlePrint}>
            🖨️ Print Sticker
          </button>
          <button 
            className="modal__btn" 
            style={{ background: "#059669", color: "white", fontWeight: "600" }}
            onClick={async () => {
              setIsProcessing(true);
              try {
                const targetIssueId = item?.issueId || item?.id;
                const result = await onConfirm(targetIssueId, returnDate);
                if (result.success) {
                  setStep("complete");
                } else {
                  toast.error(result.message || "Failed to return item");
                }
              } catch (err) {
                toast.error("Failed to return item");
              } finally {
                setIsProcessing(false);
              }
            }}
          >
            ✅ Confirm Return
          </button>
        </div>
      </Modal>
    );
  }

  // ============================================================
  // ⭐ STEP 3: RETURN COMPLETE
  // ============================================================
  if (step === "complete") {
    const productName = item.product || item.productName || "Product";

    return (
      <Modal title="Return Complete" onClose={onClose} width={500}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
          <div
            style={{
              display: "inline-block",
              padding: "6px 20px",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "16px",
              background: "#D1FAE5",
              color: "#059669",
            }}
          >
            RETURNED SUCCESSFULLY
          </div>
          <p style={{ fontSize: "18px", fontWeight: "600", margin: "8px 0" }}>
            {productName}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Unit: {qrUnitId}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Student: {item.student || item.studentName}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Returned on: {returnDate}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Restock Location: {location || "—"}
          </p>
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#EFF6FF",
              borderRadius: "8px",
              border: "1px solid #BFDBFE",
            }}
          >
            <p style={{ margin: 0, color: "#1E40AF", fontSize: "13px" }}>
              📱 QR Code has been generated and saved in the database.
            </p>
          </div>
        </div>

        <div className="modal__actions" style={{ display: "flex", gap: "10px" }}>
          <button className="modal__btn modal__btn--primary" onClick={handlePrint}>
            🖨️ Print Sticker
          </button>
          <button className="modal__btn" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return null;
}