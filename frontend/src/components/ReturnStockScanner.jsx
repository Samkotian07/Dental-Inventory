import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, ImageUp, ScanLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./ReturnStockScanner.css";

const toUnitId = (value) => {
  const scanned = value.trim();
  if (!scanned) return "";
  const marker = "/unit-history/";
  if (scanned.includes(marker)) return decodeURIComponent(scanned.split(marker)[1].split(/[?#]/)[0]);
  return scanned;
};

export default function ReturnStockScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const fileInputRef = useRef(null);
  const openCodeRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Point your camera at a returned-stock QR code.");
  const [manualCode, setManualCode] = useState("");

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  const close = () => {
    stopCamera();
    setOpen(false);
  };

  const openScannedCode = (value) => {
    const unitId = toUnitId(value);
    if (!unitId) return;
    close();
    navigate(`/unit-history/${encodeURIComponent(unitId)}`);
  };
  openCodeRef.current = openScannedCode;

  const scanUploadedImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Reading QR code from image…");
    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(imageUrl);
      openScannedCode(result.getText());
    } catch {
      setStatus("No QR code was found in that image. Try a sharper, well-lit photo.");
    } finally {
      URL.revokeObjectURL(imageUrl);
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const startCamera = async () => {
      try {
        setStatus("Scanning… align the QR code inside the frame.");
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result) => result && !cancelled && openCodeRef.current?.(result.getText()),
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch {
        setStatus("We couldn't access your camera. Allow camera access, or enter the QR code below.");
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open]);

  return (
    <>
      <button className="return-scanner__trigger" type="button" onClick={() => setOpen(true)} aria-label="Scan returned stock QR code" title="Scan returned stock">
        <ScanLine size={18} strokeWidth={2} />
      </button>

      {open && (
        <div className="return-scanner__backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="return-scanner" role="dialog" aria-modal="true" aria-labelledby="return-scanner-title">
            <header className="return-scanner__head">
              <div><span className="return-scanner__eyebrow">RETURN STOCK</span><h2 id="return-scanner-title">Scan QR code</h2></div>
              <button type="button" onClick={close} aria-label="Close scanner"><X size={19} /></button>
            </header>
            <div className="return-scanner__camera">
              <video ref={videoRef} muted playsInline />
              <div className="return-scanner__guide" aria-hidden="true" />
              <Camera size={24} aria-hidden="true" />
            </div>
            <p className="return-scanner__status" aria-live="polite">{status}</p>
            <input ref={fileInputRef} className="return-scanner__file-input" type="file" accept="image/*" onChange={scanUploadedImage} />
            <button className="return-scanner__upload" type="button" onClick={() => fileInputRef.current?.click()}>
              <ImageUp size={16} /> Upload QR image
            </button>
            <form className="return-scanner__manual" onSubmit={(event) => { event.preventDefault(); openScannedCode(manualCode); }}>
              <label htmlFor="return-qr-code">Or enter the unit ID</label>
              <div><input id="return-qr-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Paste QR link or unit ID" autoComplete="off" /><button type="submit" disabled={!manualCode.trim()}>Open</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
