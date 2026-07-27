import { useState } from "react";
import Modal from "./Modal.jsx";
import QRCode from "react-qr-code";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReturnItemModal({ item, onClose, onConfirm }) {
  const [returnDate, setReturnDate] = useState(todayISO());
  const [step, setStep] = useState("confirm"); // 'confirm' | 'qr' | 'done'

  const handleConfirm = () => {
    console.log("🔄 ReturnItemModal: handleConfirm called");
    console.log("📦 Calling onConfirm with:", {
      issueId: item.issueId,
      returnDate: returnDate,
    });

    // Pass return data to parent
    onConfirm(item.issueId, returnDate);

    console.log("📱 Setting step to 'qr'");
    setStep("qr");
  };

  const handlePrint = () => {
    const qrData = JSON.stringify({
      id: item.issueId,
      product: item.product,
      refNo: item.refNo,
      student: item.student,
      returnDate: returnDate,
      qty: item.qty,
    });

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>QR - ${item.product}</title>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">YEN DENTAL - RETURN STICKER</div>
            <div id="qrcode"></div>
            <p class="product">${item.product}</p>
            <p class="detail">Ref: ${item.refNo}</p>
            <p class="detail">Student: ${item.student}</p>
            <p class="detail">Returned: ${returnDate}</p>
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
      <Modal title="Return Item" onClose={onClose} width={440}>
        <p className="modal__lead">
          Returning <strong>{item.product}</strong> ({item.refNo}) from{" "}
          <strong>{item.student}</strong>. This will add {item.qty} item(s) back
          to inventory.
        </p>

        <div className="modal__field">
          <label htmlFor="return-date">Return Date</label>
          <input
            id="return-date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        <div className="modal__actions">
          <button className="modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleConfirm}
          >
            Confirm Return & Generate QR
          </button>
        </div>
      </Modal>
    );
  }

  // Step: QR Display
  if (step === "qr") {
    return (
      <Modal title="QR Code Generated" onClose={onClose} width={440}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
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

  return null;
}
