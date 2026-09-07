import { useRef } from "react";
import { Download, Printer, X, Package, MapPin, Calendar, Hash } from "lucide-react";
import Modal from "./Modal.jsx";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { toast } from "sonner";
import "./QRCodeDisplayModal.css";

function QRCodeSticker({ unitId, refNo, productName, location, returnDate }) {
  const stickerRef = useRef(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print the sticker");
      return;
    }

    const content = stickerRef.current?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Sticker - ${unitId}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Courier New', monospace;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .sticker {
              width: 280px;
              padding: 16px;
              border: 2px dashed #4B5563;
              border-radius: 8px;
              background: white;
              text-align: center;
            }
            .sticker-title {
              font-size: 12px;
              color: #6B7280;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            .sticker-qr {
              display: flex;
              justify-content: center;
              margin: 8px 0;
            }
            .sticker-qr img {
              width: 120px;
              height: 120px;
            }
            .sticker-divider {
              border: none;
              border-top: 1px dashed #E5E7EB;
              margin: 8px 0;
            }
            .sticker-field {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              padding: 2px 0;
            }
            .sticker-label {
              color: #6B7280;
            }
            .sticker-value {
              font-weight: 600;
              color: #111827;
            }
            .sticker-footer {
              margin-top: 8px;
              font-size: 9px;
              color: #9CA3AF;
              border-top: 1px solid #F3F4F6;
              padding-top: 6px;
            }
            .sticker-logo {
              font-size: 10px;
              font-weight: 700;
              color: #2563EB;
              letter-spacing: 3px;
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
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="qr-sticker-wrapper">
      <div className="qr-sticker" ref={stickerRef}>
        <div className="qr-sticker-title">CaviTrack</div>
        <div className="qr-sticker-qr">
          <QRCode
            value={`/unit-history/${unitId}`}
            size={120}
            level="H"
            includeMargin={true}
            bgColor="#FFFFFF"
            fgColor="#111827"
          />
        </div>
        <hr className="qr-sticker-divider" />
        <div className="qr-sticker-fields">
          <div className="qr-sticker-field">
            <span className="qr-sticker-label">
              <Hash size={12} /> Unit ID
            </span>
            <span className="qr-sticker-value">{unitId}</span>
          </div>
          <div className="qr-sticker-field">
            <span className="qr-sticker-label">
              <Package size={12} /> Product
            </span>
            <span className="qr-sticker-value">{productName}</span>
          </div>
          <div className="qr-sticker-field">
            <span className="qr-sticker-label">Ref No</span>
            <span className="qr-sticker-value">{refNo}</span>
          </div>
          <div className="qr-sticker-field">
            <span className="qr-sticker-label">
              <MapPin size={12} /> Location
            </span>
            <span className="qr-sticker-value">{location || '—'}</span>
          </div>
          <div className="qr-sticker-field">
            <span className="qr-sticker-label">
              <Calendar size={12} /> Return Date
            </span>
            <span className="qr-sticker-value">{returnDate}</span>
          </div>
        </div>
        <div className="qr-sticker-footer">
          Scan to view unit history
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
  returnDate 
}) {
  if (!isOpen) return null;

  return (
    <Modal title="QR Code Generated" onClose={onClose} width={400}>
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