import { useState } from "react";
import Modal from "./Modal.jsx";
import QRCode from "react-qr-code";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReturnItemModal({ item, onClose, onConfirm, onCondemn }) {
  const [returnDate, setReturnDate] = useState(todayISO());
  const [step, setStep] = useState("confirm"); // 'confirm' | 'qr' | 'done' | 'condemn-done'
  const [actionType, setActionType] = useState("return"); // 'return' | 'condemn'
  const [condemnReason, setCondemnReason] = useState("");
  const [showCondemnFields, setShowCondemnFields] = useState(false);

  const handleConfirm = () => {
    console.log("🔄 ReturnItemModal: handleConfirm called");
    console.log("📦 Action Type:", actionType);

    if (actionType === "return") {
      console.log("📦 Calling onConfirm with:", {
        issueId: item.issueId,
        returnDate: returnDate,
      });
      onConfirm(item.issueId, returnDate);
      console.log("📱 Setting step to 'qr'");
      setStep("qr");
    } else if (actionType === "condemn") {
      console.log("🗑️ Calling onCondemn with:", {
        issueId: item.issueId,
        returnDate: returnDate,
        reason: condemnReason,
      });
      onCondemn(item.issueId, returnDate, condemnReason);
      console.log("📱 Setting step to 'condemn-done'");
      setStep("condemn-done");
    }
  };

  const handlePrint = () => {
    const qrData = JSON.stringify({
      id: item.issueId,
      product: item.product,
      refNo: item.refNo,
      student: item.student,
      returnDate: returnDate,
      qty: item.qty,
      action: actionType,
    });

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>RETURN - ${item.product}</title>
          <style>
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              font-family: Arial, sans-serif; 
              margin: 0; 
              background: white;
            }
            .container { 
              text-align: center; 
              padding: 30px; 
            }
            #qrcode { 
              display: inline-block; 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
            }
            .product { 
              margin-top: 15px; 
              font-size: 18px; 
              font-weight: bold; 
            }
            .detail { 
              margin: 5px 0; 
              font-size: 14px; 
              color: #666; 
            }
            .header {
              font-size: 12px;
              color: #999;
              margin-bottom: 10px;
              letter-spacing: 1px;
            }
            .action-badge {
              display: inline-block;
              padding: 4px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              margin: 8px 0;
              background: #D1FAE5;
              color: #059669;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">YEN DENTAL - RETURN STICKER</div>
            <div id="qrcode"></div>
            <div class="action-badge">✅ RETURNED</div>
            <p class="product">${item.product}</p>
            <p class="detail">Ref: ${item.refNo}</p>
            <p class="detail">Student: ${item.student}</p>
            <p class="detail">Returned on: ${returnDate}</p>
            <p class="detail">Qty: ${item.qty}</p>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
          <script>
            const qrContainer = document.getElementById('qrcode');
            new QRCode(qrContainer, {
              text: '${qrData}',
              width: 200,
              height: 200,
            });
            setTimeout(() => window.print(), 800);
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // QR Data for display
  const qrData = {
    id: item.issueId,
    product: item.product,
    refNo: item.refNo,
    student: item.student,
    returnDate: returnDate,
    qty: item.qty,
  };

  // Step: Confirm Return
  if (step === "confirm") {
    return (
      <Modal title="Return / Condemn Item" onClose={onClose} width={480}>
        <p className="modal__lead">
          Processing <strong>{item.product}</strong> ({item.refNo}) from{" "}
          <strong>{item.student}</strong>.
        </p>

        {/* Action Type Selection */}
        <div className="modal__field">
          <label>Action Type</label>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => {
                setActionType("return");
                setShowCondemnFields(false);
              }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
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
              }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
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
          </div>
        </div>

        {/* Return Date Field */}
        <div className="modal__field">
          <label htmlFor="return-date">
            {actionType === "condemn" ? "Condemn Date" : "Return Date"}
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

        <div className="modal__actions">
          <button className="modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleConfirm}
            disabled={actionType === "condemn" && !condemnReason}
            style={{
              opacity: actionType === "condemn" && !condemnReason ? 0.5 : 1,
              cursor: actionType === "condemn" && !condemnReason ? "not-allowed" : "pointer",
            }}
          >
            {actionType === "condemn" ? "Confirm Condemn" : "Confirm Return & Generate QR"}
          </button>
        </div>
      </Modal>
    );
  }

  // Step: QR Display (Only for Return)
  if (step === "qr") {
    return (
      <Modal title="QR Code Generated" onClose={onClose} width={440}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "12px",
              background: "#D1FAE5",
              color: "#059669",
            }}
          >
            ✅ RETURNED
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              display: "inline-block",
              borderRadius: "8px",
            }}
          >
            <QRCode value={JSON.stringify(qrData)} size={180} />
          </div>
          <p style={{ marginTop: "12px", fontWeight: "bold" }}>
            {item.product}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Ref: {item.refNo}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Student: {item.student}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Returned: {returnDate}
          </p>
          <p style={{ margin: "8px 0", color: "#999", fontSize: "12px" }}>
            Scan QR to view full history
          </p>
        </div>

        <div
          className="modal__actions"
          style={{ display: "flex", gap: "10px" }}
        >
          <button className="modal__btn" onClick={() => setStep("confirm")}>
            Back
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handlePrint}
          >
            🖨️ Print Sticker
          </button>
          <button className="modal__btn" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // Step: Condemn Done (No QR, Just Confirmation)
  if (step === "condemn-done") {
    return (
      <Modal title="Item Condemned" onClose={onClose} width={440}>
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div
            style={{
              fontSize: "64px",
              marginBottom: "16px",
            }}
          >
            🗑️
          </div>

          <div
            style={{
              display: "inline-block",
              padding: "6px 20px",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "16px",
              background: "#FEE2E2",
              color: "#DC2626",
            }}
          >
            CONDEMNED
          </div>

          <p style={{ fontSize: "18px", fontWeight: "600", margin: "8px 0" }}>
            {item.product}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Ref: {item.refNo}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Student: {item.student}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Condemned on: {returnDate}
          </p>
          <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
            Qty: {item.qty}
          </p>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#FEF3C7",
              borderRadius: "8px",
              border: "1px solid #F59E0B",
            }}
          >
            <p style={{ margin: 0, color: "#92400E", fontSize: "14px", fontWeight: "500" }}>
              ⚠️ Reason: {condemnReason}
            </p>
            <p style={{ margin: "4px 0 0", color: "#92400E", fontSize: "12px" }}>
              This item has been removed from inventory
            </p>
          </div>
        </div>
        <div className="modal__actions">
          <button className="modal__btn" onClick={() => setStep("confirm")}>
            Back
          </button>
          <button className="modal__btn modal__btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return null;
}