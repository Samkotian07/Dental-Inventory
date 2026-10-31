import { useRef } from "react";
import { Printer } from "lucide-react";
import Modal from "./Modal.jsx";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { toast } from "sonner";
import "./QRCodeDisplayModal.css";

function QRCodeSticker({ unitId, refNo, lotNo, returnDate, lastStudent, cycleCount }) {
  const stickerRef = useRef(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print the sticker");
      return;
    }

    const content = stickerRef.current?.outerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Sticker - ${refNo || unitId || "Sticker"}</title>
          <style>
            @page {
              size: 50mm 25mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              width: 50mm;
              height: 25mm;
              font-family: Arial, sans-serif;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .qr-sticker {
              width: 50mm;
              height: 25mm;
              display: flex;
              align-items: center;
              gap: 2mm;
              padding: 1.5mm;
              border: 1px solid #ccc;
              border-radius: 1mm;
              background: white;
              box-sizing: border-box;
              font-family: Arial, sans-serif;
            }
            .qr-sticker-qr {
              width: 2cm;
              height: 2cm;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-sticker-qr svg {
              width: 100% !important;
              height: 100% !important;
            }
            .qr-sticker-info {
              flex: 1;
              font-size: 8pt;
              line-height: 1.15;
              color: #000;
              overflow: hidden;
            }
            .qr-sticker-line {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="qr-sticker-wrapper">
      <div className="qr-sticker" ref={stickerRef}>
        <div className="qr-sticker-qr">
          <QRCode
            value={`${window.location.origin}/unit-history/${encodeURIComponent(unitId || refNo || "")}`}
            size={70}
            level="M"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
        <div className="qr-sticker-info">
          <div className="qr-sticker-line">Ref: {refNo || "—"}</div>
          <div className="qr-sticker-line">Lot: {lotNo || "—"}</div>
          <div className="qr-sticker-line">Returned: {returnDate || "—"}</div>
          <div className="qr-sticker-line">Last Issued: {lastStudent || "—"}</div>
          <div className="qr-sticker-line">Cycle: {cycleCount ?? 1}</div>
        </div>
      </div>
      <div className="qr-sticker-actions">
        <button className="qr-sticker-btn qr-sticker-btn-print" onClick={handlePrint}>
          <Printer size={16} /> Print Sticker
        </button>
      </div>
    </div>
  );
}

export default function QRCodeDisplayModal({ 
  isOpen, 
  onClose, 
  unitId, 
  refNo, 
  productName, 
  location, 
  returnDate,
  lotNo,
  lastStudent,
  cycleCount
}) {
  if (!isOpen) return null;

  return (
    <Modal title="QR Code Generated" onClose={onClose} width={420}>
      <div className="qr-display-modal">
        <div className="qr-display-success">
          <span className="qr-display-check">✅</span>
          <span>Unit returned successfully! QR Code generated.</span>
        </div>
        <QRCodeSticker
          unitId={unitId}
          refNo={refNo}
          productName={productName}
          location={location}
          returnDate={returnDate}
          lotNo={lotNo}
          lastStudent={lastStudent}
          cycleCount={cycleCount}
        />
        <div className="qr-display-actions">
          <button className="qr-display-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
