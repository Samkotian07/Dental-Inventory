import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Package, History, User, Calendar, CheckCircle, Clock, 
  XCircle, RotateCcw, Ban, AlertTriangle, LogIn 
} from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import { toast } from "sonner";
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
    'active': { label: 'Available', icon: <CheckCircle size={14} />, class: 'status-available' },
    'issued': { label: 'Issued', icon: <Clock size={14} />, class: 'status-issued' },
    'returned': { label: 'Returned', icon: <CheckCircle size={14} />, class: 'status-returned' },
    'condemned': { label: 'Condemned', icon: <XCircle size={14} />, class: 'status-condemned' },
    'Active': { label: 'Active', icon: <Clock size={14} />, class: 'status-issued' },
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
  const { stock, issuedItems, getUnitHistory, issueItem, returnIssuedItem, condemnIssuedItem } = useInventory();
  const { isAuthenticated, user } = useAuth();
  
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [apiUnit, setApiUnit] = useState(null);
  const [apiHistory, setApiHistory] = useState([]);

  const canWrite = user?.role === 'admin' || user?.role === 'staff';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!unitId) {
      setLoading(false);
      return;
    }
    
    const foundInStock = (stock || []).find(s => 
      s.id === unitId || 
      s.unitId === unitId || 
      s.refNo === unitId ||
      s.inventoryId === unitId
    );

    const localHistory = (issuedItems || [])
      .filter(i => 
        i.unitId === unitId || 
        i.inventoryId === unitId || 
        i.refNo === unitId ||
        i.id === unitId ||
        i.issueId === unitId
      )
      .sort((a, b) => new Date(b.issueDate || b.date || 0) - new Date(a.issueDate || a.date || 0));

    if (foundInStock) {
      setApiUnit(foundInStock);
      setApiHistory(localHistory);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetch(`http://127.0.0.1:5000/api/inventory/public-history/${encodeURIComponent(unitId)}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.product) {
          const prod = data.product;
          setApiUnit({
            id: prod.id || unitId,
            unitId: prod.id || unitId,
            refNo: prod.ref_no || prod.refNo || unitId,
            product: prod.product_name || prod.productName || prod.ref_no,
            productName: prod.product_name || prod.productName || prod.ref_no,
            company: prod.company_name || prod.company || prod.companyName || "Vendor",
            companyName: prod.company_name || prod.company || prod.companyName || "Vendor",
            category: prod.category || "General",
            lotNo: prod.lot_no || prod.lotNo || "—",
            freshLocation: prod.fresh_location || prod.freshLocation || "—",
            isReturned: Boolean(prod.is_returned),
            status: prod.status || "active",
            quantity: prod.quantity || 1,
          });
          const historyList = (data.history || []).map((c, idx) => ({
            id: c.issue_id || `cycle-${idx}`,
            issueId: c.issue_id || `cycle-${idx}`,
            student: c.student,
            studentName: c.student,
            studentId: c.studentId,
            issueDate: c.issued,
            date: c.issued,
            returnDate: c.returned === 'NULL' ? null : c.returned,
            status: c.rawStatus === 'returned' ? 'Returned' : c.rawStatus === 'condemned' ? 'Condemned' : 'Active',
          }));
          setApiHistory(historyList);
        } else {
          setApiUnit(null);
          setApiHistory([]);
        }
      })
      .catch(err => {
        console.error("Public history fetch error:", err);
        if (isMounted) {
          setApiUnit(null);
          setApiHistory([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [unitId, stock, issuedItems]);

  const unit = apiUnit;
  const history = apiHistory;

  const handleGoBack = () => {
    navigate(-1);
  };

  const getCurrentStatus = () => {
    if (!unit) return 'unknown';
    
    const activeIssue = history.find(h => h.status === 'Active' || h.status === 'active');
    if (activeIssue) return 'issued';
    
    if (unit.status === 'condemned') return 'condemned';
    
    if (unit.isReturned === true || unit.status === 'returned') return 'returned';
    
    return 'available';
  };

  const currentStatus = getCurrentStatus();

  const handleIssue = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to issue this unit");
      navigate(`/login?redirect=/unit-history/${unitId}`);
      return;
    }
    if (!canWrite) {
      toast.error("You don't have permission to issue items");
      return;
    }
    
    const studentId = prompt("Enter student ID to issue this unit:");
    if (!studentId) return;
    
    setIsActionLoading(true);
    try {
      const result = await issueItem({
        studentId: studentId,
        unitId: unitId,
        refNo: unit?.refNo,
        qty: 1,
        stockType: unit?.isReturned ? 'returned' : 'fresh',
      });
      if (result.success) {
        toast.success(`Unit ${unitId} issued successfully`);
      } else {
        toast.error(result.message || "Failed to issue unit");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to return this unit");
      navigate(`/login?redirect=/unit-history/${unitId}`);
      return;
    }
    if (!canWrite) {
      toast.error("You don't have permission to return items");
      return;
    }
    
    const activeIssue = history.find(h => h.status === 'Active' || h.status === 'active');
    if (!activeIssue) {
      toast.error("No active issue found for this unit");
      return;
    }
    
    const condition = prompt("Enter return condition (Good, Damaged, Expired):", "Good");
    if (!condition) return;
    
    setIsActionLoading(true);
    try {
      const result = await returnIssuedItem(activeIssue.issueId || activeIssue.id, new Date().toISOString().slice(0, 10), condition);
      if (result.success) {
        toast.success(`Unit ${unitId} returned successfully`);
      } else {
        toast.error(result.message || "Failed to return unit");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCondemn = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to condemn this unit");
      navigate(`/login?redirect=/unit-history/${unitId}`);
      return;
    }
    if (!isAdmin) {
      toast.error("Only admins can condemn items");
      return;
    }
    
    if (!confirm(`Are you sure you want to condemn unit ${unitId}?`)) return;
    
    const activeIssue = history.find(h => h.status === 'Active' || h.status === 'active');
    if (!activeIssue) {
      toast.error("No active issue found for this unit");
      return;
    }
    
    setIsActionLoading(true);
    try {
      const result = await condemnIssuedItem(activeIssue.issueId || activeIssue.id);
      if (result.success) {
        toast.success(`Unit ${unitId} condemned successfully`);
      } else {
        toast.error(result.message || "Failed to condemn unit");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const productInfo = unit ? {
    refNo: unit.refNo,
    productName: unit.product || unit.productName,
    category: unit.category,
    company: unit.company || unit.companyName,
    lotNo: unit.lotNo,
    isReturned: unit.isReturned,
    status: unit.status,
    quantity: unit.quantity,
    freshLocation: unit.freshLocation || unit.fresh_location,
  } : null;

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
          <div className="unit-history-header">
            <button className="unit-history-back-btn" onClick={handleGoBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <h1>Unit History</h1>
          </div>

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
                <StatusBadge status={currentStatus} />
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
              {/* ⭐ RESTOCK LOCATION - ADDED */}
              <div className="unit-info-detail">
                <span>Restock Location</span>
                <p>{productInfo?.freshLocation || '—'}</p>
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

          {isAuthenticated && canWrite && (
            <div className="unit-actions-card">
              <h4>Quick Actions</h4>
              <div className="unit-actions-buttons">
                {currentStatus === 'available' || currentStatus === 'returned' ? (
                  <button
                    className="unit-action-btn unit-action-issue"
                    onClick={handleIssue}
                    disabled={isActionLoading}
                  >
                    <RotateCcw size={16} /> Issue Unit
                  </button>
                ) : currentStatus === 'issued' ? (
                  <>
                    <button
                      className="unit-action-btn unit-action-return"
                      onClick={handleReturn}
                      disabled={isActionLoading}
                    >
                      <CheckCircle size={16} /> Return Unit
                    </button>
                    {isAdmin && (
                      <button
                        className="unit-action-btn unit-action-condemn"
                        onClick={handleCondemn}
                        disabled={isActionLoading}
                      >
                        <Ban size={16} /> Condemn
                      </button>
                    )}
                  </>
                ) : currentStatus === 'condemned' ? (
                  <div className="unit-action-condemned-msg">
                    <AlertTriangle size={16} />
                    <span>This unit has been condemned</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="unit-actions-card unit-actions-login-required">
              <LogIn size={18} />
              <span>Login to issue, return, or condemn this unit</span>
              <button
                className="unit-action-btn unit-action-login"
                onClick={() => navigate(`/login?redirect=/unit-history/${unitId}`)}
              >
                Login
              </button>
            </div>
          )}

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