import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import QRCode from "react-qr-code";
import { useInventory } from "../../context/InventoryContext.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReturnItemModal({ item, onClose, onConfirm, onCondemn, onExchange }) {
  const { stock = [], issuedItems = [] } = useInventory();
  const [returnDate, setReturnDate] = useState(todayISO());
  const [step, setStep] = useState("confirm");
  const [actionType, setActionType] = useState("return");
  const [condemnReason, setCondemnReason] = useState("");
  const [exchangeReason, setExchangeReason] = useState("Damaged");
  const [showCondemnFields, setShowCondemnFields] = useState(false);
  const [showExchangeFields, setShowExchangeFields] = useState(false);

  // Match item in stock to get expiry date
  const stockMatch = useMemo(() => {
    if (!item) return null;
    // ⭐ Match by inventoryId (individual unit)
    return stock.find((s) => s.id === item.inventoryId);
  }, [stock, item]);

  const expiryDate = useMemo(() => {
    return item?.expiry || item?.expiryDate || stockMatch?.expiry || stockMatch?.expiryDate || "—";
  }, [item, stockMatch]);

  // ⭐ FIXED: History for THIS SPECIFIC UNIT (by inventoryId)
  const productHistory = useMemo(() => {
    if (!item) return [];
    
    // ⭐ Track by INVENTORY ID (unique per unit)
    const inventoryId = item.inventoryId || item.id;
    
    const matches = (issuedItems || []).filter((iss) => {
      return iss.inventoryId === inventoryId;  // ⭐ Only this specific unit
    });

    matches.sort((a, b) => new Date(a.date || a.issuedDate || 0) - new Date(b.date || b.issuedDate || 0));

    if (matches.length === 0 && item) {
      matches.push({
        issueId: item.issueId || item.id || "ISS-001",
        student: item.student || item.studentName || "Student",
        date: item.date || item.issuedDate || todayISO(),
        returnDate: returnDate,
        status: "Returned",
      });
    }

    return matches.map((iss, index) => {
      const s = String(iss.status || "").toLowerCase();
      let statusLabel = "🔄 Current";

      if (s === "returned") {
        statusLabel = "✅ Complete";
      } else if (s === "condemned") {
        statusLabel = "❌ Condemned";
      }

      return {
        cycle: index + 1,
        student: iss.student || iss.studentName || "Student",
        issued: iss.date || iss.issuedDate || "-",
        returned: s === "returned" ? (iss.returnDate || returnDate || "-") : (s === "condemned" ? (iss.returnDate || "-") : "NULL"),
        status: statusLabel,
        rawStatus: s,
      };
    });
  }, [item, issuedItems, returnDate]);

  const summaryText = useMemo(() => {
    const total = productHistory.length;
    return `Summary: ${total} ${total === 1 ? "cycle" : "cycles"}`;
  }, [productHistory]);

  const handleConfirm = () => {
    if (actionType === "return") {
      onConfirm(item.issueId, returnDate);
      setStep("qr");
    } else if (actionType === "condemn") {
      onCondemn(item.issueId, returnDate, condemnReason);
      setStep("condemn-done");
    } else if (actionType === "exchange") {
      if (onExchange) {
        onExchange(item.issueId, returnDate, exchangeReason);
      }
      setStep("exchange-done");
    }
  };

  const handlePrint = () => {
    const batchVal = item.lotNo || item.batchNo || "4510315832";
    const unitId = item.inventoryId || item.id || item.refNo;

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
          <title>PRINT STICKER - ${item.product}</title>
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
            <div class="header">YEN LEDGER — RETURN STICKER</div>
            <div class="qr-box">${qrSvgHtml}</div>
            <br/>
            <div class="badge">✅ RETURNED</div>
            <div class="product-name">Product: ${item.product} (Unit: ${unitId})</div>
            <div class="batch-info">
              <strong>Batch:</strong> ${batchVal} | <strong>Expiry Date:</strong> ${expiryDate}
            </div>
            <div class="detail-line">
              Last Student: ${item.student} | Returned: ${returnDate}
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

  const scanUrl = `${window.location.origin}/unit-history/${encodeURIComponent(item?.inventoryId || item?.id || item?.refNo || "")}`;

  // Step: Confirm Return
  if (step === "confirm") {
    return (
      <Modal title="Return / Condemn Item" onClose={onClose} width={480}>
        <p className="modal__lead">
          Processing <strong>{item.product}</strong> (Unit: {item.inventoryId || item.id}) from{" "}
          <strong>{item.student}</strong>.
        </p>

        {/* Action Type Selection */}
        <div className="modal__field">
          <label>Action Type / Return Mode</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={() => {
                setActionType("return");
                setShowCondemnFields(false);
                setShowExchangeFields(false);
              }}
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
              ✅ Return to Inventory
            </button>
            <button
              type="button"
              onClick={() => {
                setActionType("condemn");
                setShowCondemnFields(true);
                setShowExchangeFields(false);
              }}
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
            <button
              type="button"
              onClick={() => {
                setActionType("exchange");
                setShowCondemnFields(false);
                setShowExchangeFields(true);
              }}
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
              🔄 Failed - Send for Exchange
            </button>
          </div>
        </div>

        {/* Return Date Field */}
        <div className="modal__field">
          <label htmlFor="return-date">
            {actionType === "condemn"
              ? "Condemn Date"
              : actionType === "exchange"
              ? "Exchange Request Date"
              : "Return Date"}
          </label>
          <input
            id="return-date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        {/* Condemn Reason Field */}
        {showCondemnFields && (
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
              <option value="Returned">Returned</option>
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

        {/* Exchange Reason Field */}
        {showExchangeFields && (
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
              <option value="Damaged">Damaged</option>
              <option value="Defective">Defective</option>
              <option value="Expired">Expired</option>
              <option value="Quality Failed">Quality Failed</option>
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

        {/* Info Message */}
        {actionType === "return" && (
          <p style={{ fontSize: "13px", color: "#059669", marginTop: "8px" }}>
            ✅ This will add <strong>{item.qty}</strong> item(s) back to inventory.
          </p>
        )}
        {actionType === "condemn" && (
          <p style={{ fontSize: "13px", color: "#DC2626", marginTop: "8px" }}>
            ⚠️ This will mark <strong>{item.qty}</strong> item(s) as condemned
            and remove them from inventory. This cannot be undone.
          </p>
        )}
        {actionType === "exchange" && (
          <p style={{ fontSize: "13px", color: "#D97706", marginTop: "8px" }}>
            🔄 This item will be marked as failed and sent for exchange with vendor (added to Track Returns).
          </p>
        )}

        <div className="modal__actions">
          <button className="modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleConfirm}
            disabled={
              (actionType === "condemn" && !condemnReason) ||
              (actionType === "exchange" && !exchangeReason)
            }
            style={{
              opacity:
                (actionType === "condemn" && !condemnReason) ||
                (actionType === "exchange" && !exchangeReason)
                  ? 0.5
                  : 1,
              cursor:
                (actionType === "condemn" && !condemnReason) ||
                (actionType === "exchange" && !exchangeReason)
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {actionType === "condemn"
              ? "Confirm Condemn"
              : actionType === "exchange"
              ? "Confirm Send for Exchange"
              : "Confirm Return & Generate QR"}
          </button>
        </div>
      </Modal>
    );
  }

  // Step: QR Display
  if (step === "qr") {
    const batchVal = item.lotNo || item.batchNo || "4510315832";
    const unitId = item.inventoryId || item.id || item.refNo;
    
    return (
      <Modal title="QR Code & Unit History" onClose={onClose} width={640}>
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
                ✅ RETURNED
              </div>
              <h4 style={{ margin: "4px 0", fontSize: "16px", color: "#0F172A", fontWeight: "700" }}>
                Product: {item.product} (Unit: {unitId})
              </h4>
              <p style={{ margin: "4px 0", fontSize: "13.5px", color: "#475569" }}>
                <strong>Batch:</strong> {batchVal} | <strong>Expiry Date:</strong> {expiryDate}
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#64748B" }}>
                Last Student: {item.student} | Returned: {returnDate}
              </p>
            </div>
          </div>

          {/* Unit Lifecycle History Table */}
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
                  {productHistory.map((h) => (
                    <tr key={h.cycle} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: "600", fontFamily: "monospace" }}>
                        {h.cycle}
                      </td>
                      <td style={{ padding: "9px 12px", fontWeight: "500", color: "#1E293B" }}>
                        {h.student}
                      </td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{h.issued}</td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>{h.returned}</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background:
                              h.rawStatus === "returned"
                                ? "#D1FAE5"
                                : h.rawStatus === "condemned"
                                ? "#FEE2E2"
                                : "#FEF3C7",
                            color:
                              h.rawStatus === "returned"
                                ? "#059669"
                                : h.rawStatus === "condemned"
                                ? "#DC2626"
                                : "#D97706",
                            display: "inline-block",
                          }}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
              {summaryText}
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
          <button className="modal__btn" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // Step: Condemn Done
  if (step === "condemn-done") {
    return (
      <Modal title="Item Condemned" onClose={onClose} width={440}>
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🗑️</div>
          <div style={{
            display: "inline-block",
            padding: "6px 20px",
            borderRadius: "20px",
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "16px",
            background: "#FEE2E2",
            color: "#DC2626",
          }}>CONDEMNED</div>
          <p style={{ fontSize: "18px", fontWeight: "600", margin: "8px 0" }}>{item.product}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Unit: {item.inventoryId || item.id}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Student: {item.student}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Condemned on: {returnDate}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Qty: {item.qty}</p>
          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#FEF3C7",
            borderRadius: "8px",
            border: "1px solid #F59E0B",
          }}>
            <p style={{ margin: 0, color: "#92400E", fontSize: "14px", fontWeight: "500" }}>⚠️ Reason: {condemnReason}</p>
            <p style={{ margin: "4px 0 0", color: "#92400E", fontSize: "12px" }}>This unit has been removed from inventory</p>
          </div>
        </div>
        <div className="modal__actions">
          <button className="modal__btn" onClick={() => setStep("confirm")}>Back</button>
          <button className="modal__btn modal__btn--primary" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  // Step: Exchange Done
  if (step === "exchange-done") {
    return (
      <Modal title="Sent for Exchange" onClose={onClose} width={440}>
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔄</div>
          <div style={{
            display: "inline-block",
            padding: "6px 20px",
            borderRadius: "20px",
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "16px",
            background: "#FEF3C7",
            color: "#D97706",
          }}>FAILED - SENT FOR EXCHANGE</div>
          <p style={{ fontSize: "18px", fontWeight: "600", margin: "8px 0" }}>{item.product}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Unit: {item.inventoryId || item.id}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Student: {item.student}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Exchange Date: {returnDate}</p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>Qty: {item.qty}</p>
          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#FFFBEB",
            borderRadius: "8px",
            border: "1px solid #F59E0B",
          }}>
            <p style={{ margin: 0, color: "#92400E", fontSize: "14px", fontWeight: "500" }}>⚠️ Reason: {exchangeReason}</p>
            <p style={{ margin: "4px 0 0", color: "#92400E", fontSize: "12px" }}>Created exchange request in Track Returns</p>
          </div>
        </div>
        <div className="modal__actions">
          <button className="modal__btn" onClick={() => setStep("confirm")}>Back</button>
          <button className="modal__btn modal__btn--primary" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return null;
}