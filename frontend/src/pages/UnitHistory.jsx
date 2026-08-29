import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Package, History, User, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import "./css/UnitHistory.css";

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const statusMap = {
    'active': { label: 'Active', icon: <Clock size={14} />, class: 'status-active' },
    'returned': { label: 'Returned', icon: <CheckCircle size={14} />, class: 'status-returned' },
    'condemned': { label: 'Condemned', icon: <XCircle size={14} />, class: 'status-condemned' },
    'Active': { label: 'Active', icon: <Clock size={14} />, class: 'status-active' },
    'Returned': { label: 'Returned', icon: <CheckCircle size={14} />, class: 'status-returned' },
    'Condemned': { label: 'Condemned', icon: <XCircle size={14} />, class: 'status-condemned' },
  };
  
  const normalizedStatus = status?.toLowerCase() || 'active';
  const info = statusMap[normalizedStatus] || statusMap['active'];
  
  return (
    <span className={`unit-history-status-badge ${info.class}`}>
      {info.icon} {info.label}
    </span>
  );
}

export default function UnitHistory() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const onMenuClick = useMenuClick();
  const { stock, issuedItems, getUnitHistory } = useInventory();
  
  const [unit, setUnit] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unitId) return;
    
    setLoading(true);
    
    // Find the unit in stock
    const foundUnit = stock.find(s => s.id === unitId);
    setUnit(foundUnit || null);
    
    // Get history for this unit
    const unitHistory = getUnitHistory(unitId);
    setHistory(unitHistory);
    
    setLoading(false);
  }, [unitId, stock, getUnitHistory]);

  const handleGoBack = () => {
    navigate(-1);
  };

  // Get product info
  const productInfo = unit ? {
    refNo: unit.refNo,
    productName: unit.product || unit.productName,
    category: unit.category,
    company: unit.company || unit.companyName,
    lotNo: unit.lotNo,
    isReturned: unit.isReturned,
    status: unit.status,
    quantity: unit.quantity,
  } : null;

  // If unit not found
  if (!loading && !unit) {
    return (
      <>
        <DashboardHeader title="Unit History" onMenuClick={onMenuClick} />
        <main className="unit-history-page">
          <div className="unit-history-not-found">
            <Package size={48} strokeWidth={1.5} />
            <h2>Unit Not Found</h2>
            <p>Unit ID: <strong>{unitId}</strong> does not exist in inventory.</p>
            <button className="unit-history-back-btn" onClick={handleGoBack}>
              <ArrowLeft size={16} /> Go Back
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Unit History" onMenuClick={onMenuClick} />
      
      <main className="unit-history-page">
        <div className="unit-history-container">
          {/* Header with back button */}
          <div className="unit-history-header">
            <button className="unit-history-back-btn" onClick={handleGoBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <h1>Unit History</h1>
          </div>

          {/* Unit Information Card */}
          <div className="unit-info-card">
            <div className="unit-info-header">
              <div className="unit-info-icon">
                <Package size={24} strokeWidth={2} />
              </div>
              <div className="unit-info-main">
                <h2 className="unit-info-id">{unitId}</h2>
                <p className="unit-info-product">
                  {productInfo?.productName || 'Unknown Product'}
                  <span className="unit-info-ref">({productInfo?.refNo || 'N/A'})</span>
                </p>
              </div>
              <div className="unit-info-badges">
                {productInfo?.isReturned ? (
                  <span className="unit-type-badge returned">🔄 Returned Stock</span>
                ) : (
                  <span className="unit-type-badge fresh">📦 Fresh Stock</span>
                )}
                <StatusBadge status={productInfo?.status} />
              </div>
            </div>
            
            <div className="unit-info-details">
              <div className="unit-info-detail">
                <span>Category</span>
                <p>{productInfo?.category || '—'}</p>
              </div>
              <div className="unit-info-detail">
                <span>Company</span>
                <p>{productInfo?.company || '—'}</p>
              </div>
              <div className="unit-info-detail">
                <span>Lot No</span>
                <p>{productInfo?.lotNo || '—'}</p>
              </div>
              <div className="unit-info-detail">
                <span>Quantity</span>
                <p>{productInfo?.quantity || 0}</p>
              </div>
              <div className="unit-info-detail">
                <span>Total Cycles</span>
                <p>{history.length}</p>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="unit-history-timeline">
            <h3 className="timeline-title">
              <History size={18} strokeWidth={2} />
              Issue History ({history.length} cycles)
            </h3>
            
            {loading ? (
              <div className="unit-history-loading">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="unit-history-empty-state">
                <Package size={32} strokeWidth={1.5} />
                <p>This unit has no issue history yet.</p>
                <span className="unit-history-empty-sub">It has never been issued to a student.</span>
              </div>
            ) : (
              <div className="timeline">
                {history.map((item, index) => {
                  const isLatest = index === 0;
                  const isReturned = item.status === 'Returned';
                  const isActive = item.status === 'Active';
                  
                  return (
                    <div key={item.issueId} className={`timeline-item ${isLatest ? 'timeline-item-latest' : ''}`}>
                      <div className="timeline-marker">
                        <div className={`timeline-dot ${isActive ? 'dot-active' : isReturned ? 'dot-returned' : 'dot-condemned'}`} />
                        {index < history.length - 1 && <div className="timeline-line" />}
                      </div>
                      
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-cycle">Cycle #{history.length - index}</span>
                          <StatusBadge status={item.status} />
                          {isLatest && <span className="timeline-latest-badge">Latest</span>}
                        </div>
                        
                        <div className="timeline-body">
                          <div className="timeline-student">
                            <User size={14} strokeWidth={2} />
                            <span><strong>{item.student || item.studentName}</strong></span>
                            <span className="timeline-student-id">({item.studentId || 'N/A'})</span>
                          </div>
                          
                          <div className="timeline-dates">
                            <div className="timeline-date">
                              <Calendar size={14} strokeWidth={2} />
                              <span>Issued: {formatDisplayDate(item.issueDate)}</span>
                              <span className="timeline-time">{formatTime(item.issueDate)}</span>
                            </div>
                            {item.returnDate && (
                              <div className="timeline-date timeline-date-returned">
                                <CheckCircle size={14} strokeWidth={2} />
                                <span>Returned: {formatDisplayDate(item.returnDate)}</span>
                                <span className="timeline-time">{formatTime(item.returnDate)}</span>
                              </div>
                            )}
                            {!item.returnDate && isActive && (
                              <div className="timeline-date timeline-date-active">
                                <Clock size={14} strokeWidth={2} />
                                <span>Currently issued</span>
                              </div>
                            )}
                          </div>
                          
                          {item.returnCondition && (
                            <div className="timeline-condition">
                              <span>Return Condition: <strong>{item.returnCondition}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {history.length > 0 && (
            <div className="unit-history-stats">
              <div className="stat-card">
                <span className="stat-label">Total Issues</span>
                <span className="stat-value">{history.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Returned</span>
                <span className="stat-value">{history.filter(h => h.status === 'Returned').length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Currently Active</span>
                <span className="stat-value">{history.filter(h => h.status === 'Active').length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Condemned</span>
                <span className="stat-value">{history.filter(h => h.status === 'Condemned').length}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}