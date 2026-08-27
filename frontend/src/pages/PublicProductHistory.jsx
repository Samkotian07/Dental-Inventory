import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Package } from "lucide-react";
import "./PublicProductHistory.css";

const API_URL = "http://localhost:5000/api";

function formatDate(iso) {
  if (!iso || iso === "NULL" || iso === "-") return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function PublicProductHistory() {
  const { refNo } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/inventory/public-history/${refNo}`);
        if (!res.ok) {
          throw new Error("Failed to load product history");
        }
        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setError(json.message || "Product not found");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Unable to connect to inventory server.");
      } finally {
        setLoading(false);
      }
    }
    if (refNo) {
      fetchHistory();
    }
  }, [refNo]);

  if (loading) {
    return (
      <div className="public-history">
        <div className="public-history__loading">
          🔄 Loading Product History...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="public-history">
        <div className="public-history__container">
          <div className="public-history__card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3 style={{ color: "#DC2626", margin: "0 0 8px" }}>⚠️ Product Not Found</h3>
            <p style={{ color: "#64748B", margin: 0 }}>
              {error || "Could not retrieve details for this item."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { product, history = [], summary } = data;

  return (
    <div className="public-history">
      <div className="public-history__container">
        {/* Brand Header */}
        <div className="public-history__header">
          <div className="public-history__logo-badge">Y</div>
          <div className="public-history__header-titles">
            <h2>YEN LEDGER — DENTAL INVENTORY</h2>
            <p>Product Lifecycle & Issuance Verification</p>
          </div>
        </div>

        {/* Product Summary Card */}
        <div className="public-history__card">
          <h3 className="public-history__product-title">
            <Package size={20} style={{ verticalAlign: "middle", marginRight: "8px", color: "#2563EB" }} />
            {product.productName || product.product} ({product.refNo})
          </h3>
          <div className="public-history__grid">
            <div className="public-history__grid-item">
              <span>Ref No</span>
              <p>{product.refNo || "—"}</p>
            </div>
            <div className="public-history__grid-item">
              <span>Batch / Lot No</span>
              <p>{product.lotNo || product.lot_no || "—"}</p>
            </div>
            <div className="public-history__grid-item">
              <span>Expiry Date</span>
              <p>{formatDate(product.expiryDate || product.expiry_date)}</p>
            </div>
            <div className="public-history__grid-item">
              <span>Category</span>
              <p>{product.category || "—"}</p>
            </div>
          </div>
        </div>

        {/* Complete Lifecycle History Table */}
        <div className="public-history__table-wrapper">
          <div className="public-history__table-head">
            <h3>📋 Product History</h3>
          </div>
          <div className="public-history__scroll">
            <table className="public-history__table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center", width: "50px" }}>Cycle</th>
                  <th>Student</th>
                  <th>Issued Date</th>
                  <th>Returned Date</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#94A3B8" }}>
                      No issue cycles recorded for this item yet.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => {
                    const isComp = row.rawStatus === "returned" || row.status.includes("Complete");
                    const isCond = row.rawStatus === "condemned" || row.status.includes("Condemned");
                    return (
                      <tr key={row.cycle}>
                        <td style={{ textAlign: "center", fontWeight: "700", fontFamily: "monospace" }}>
                          {row.cycle}
                        </td>
                        <td style={{ fontWeight: "600" }}>{row.student}</td>
                        <td style={{ color: "#475569" }}>{formatDate(row.issued)}</td>
                        <td style={{ color: "#475569" }}>{formatDate(row.returned)}</td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`public-history__status-pill public-history__status-pill--${
                              isComp ? "complete" : isCond ? "condemned" : "current"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="public-history__summary-bar">
            {summary || `Summary: ${history.length} cycles`}
          </div>
        </div>
      </div>
    </div>
  );
}
