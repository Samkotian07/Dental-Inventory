import { useState, useMemo } from "react";
import { Search, Package, ChevronDown, ChevronUp, History } from "lucide-react";
import { useData } from "../context/DataContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import Pagination from "./Pagination.jsx";
import Badge from "./common/Badge.jsx";
import ToggleSwitch from "./common/ToggleSwitch.jsx";
import { formatDate } from "./utils/helpers.js";
import { toast } from "sonner";
import { useMenuClick } from "./Layout.jsx";
import "./StockHandle.css";

const PAGE_SIZE = 8;

export default function StockHandle() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { stock, updateStockItem, toggleStockStatus, getInventoryId, issuedItems } = useInventory();
  const [searchRef, setSearchRef] = useState("");
  const [foundItem, setFoundItem] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});

  // ⭐ Toggle expand
  const toggleExpand = (refNo) => {
    setExpandedRows(prev => ({
      ...prev,
      [refNo]: !prev[refNo]
    }));
  };

  // ⭐ Group stock by ref_no with individual units
  const groupedStock = useMemo(() => {
    const groupedMap = {};
    (stock || []).forEach((r) => {
      const key = r.refNo || r.id;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          id: key,
          refNo: r.refNo,
          productName: r.productName || r.product,
          product: r.productName || r.product,
          category: r.category,
          company: r.company,
          size: r.size,
          lotNo: r.lotNo,
          expiry: r.expiry,
          quantity: 0,
          qty: 0,
          status: r.status,
          returnedCount: 0,
          units: [],
          unitIds: [],
        };
      }
      const unitQty = r.quantity || 1;
      groupedMap[key].quantity += unitQty;
      groupedMap[key].qty += unitQty;
      if (r.isReturned === true) {
        groupedMap[key].returnedCount += unitQty;
      }
      groupedMap[key].units.push(r);
      groupedMap[key].unitIds.push(r.id);
    });
    return Object.values(groupedMap);
  }, [stock]);

  const handleSearch = () => {
    const item = groupedStock.find(
      (i) => (i.refNo || "").toLowerCase() === searchRef.trim().toLowerCase(),
    );
    if (item) {
      setFoundItem(item);
    } else {
      setFoundItem(null);
      toast.error("No item found with that Ref No");
    }
  };

  // ⭐ Toggle status for a specific unit (for returned units)
  const handleToggleUnitStatus = async (unitId, refNo) => {
    const result = await toggleStockStatus(unitId);
    if (result.success) {
      toast.success(`Unit ${unitId} status updated`);
      // Update foundItem if needed
      if (foundItem && foundItem.refNo === refNo) {
        const updatedUnit = stock.find(s => s.id === unitId);
        if (updatedUnit) {
          const updatedUnits = foundItem.units.map(u => 
            u.id === unitId ? { ...u, status: updatedUnit.status } : u
          );
          setFoundItem({ ...foundItem, units: updatedUnits });
        }
      }
    } else {
      toast.error(result.message || "Failed to update status");
    }
  };

  // ⭐ Toggle all units (for fresh products)
  const handleToggleAllUnits = async (refNo, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const productUnits = stock.filter(r => r.refNo === refNo);
    let successCount = 0;
    
    for (const unit of productUnits) {
      const result = await toggleStockStatus(unit.id);
      if (result.success) successCount++;
    }
    
    if (successCount === productUnits.length) {
      toast.success(`All ${successCount} units set to ${newStatus}`);
    } else {
      toast.warning(`Updated ${successCount} of ${productUnits.length} units`);
    }
    
    if (foundItem && foundItem.refNo === refNo) {
      setFoundItem({ ...foundItem, status: newStatus });
    }
  };

  const filtered = useMemo(() => {
    return groupedStock.filter(
      (i) =>
        !search ||
        i.refNo.toLowerCase().includes(search.toLowerCase()) ||
        (i.productName || i.product || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [groupedStock, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedInventory = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // ⭐ Get unit history
  const getUnitHistory = (unitId) => {
    return (issuedItems || [])
      .filter(i => i.unitId === unitId)
      .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  };

  return (
    <>
      <DashboardHeader title="Stock Handle" onMenuClick={onMenuClick} />

      <main className="stock-handle">
        <section className="stock-handle__card">
          <div className="sd-search-section">
            <h3 className="sd-section-title">Search Item</h3>
            <div className="sd-search-controls">
              <div className="sd-search-input-wrapper">
                <Search size={18} className="sd-search-icon" />
                <input
                  type="text"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter Ref No (e.g. INV-001)"
                  className="sd-search-input"
                />
              </div>
              <button onClick={handleSearch} className="sd-search-btn">
                Search
              </button>
            </div>

            {foundItem && (
              <div className="sd-found-item">
                <div className="sd-found-item-header">
                  <div className="sd-found-item-icon">
                    <Package size={22} className="sd-found-item-icon-svg" />
                  </div>
                  <div>
                    <p className="sd-found-item-name">{foundItem.productName}</p>
                    <p className="sd-found-item-details">
                      {foundItem.refNo} - Qty: {foundItem.quantity} - Expires:{" "}
                      {formatDate(foundItem.expiry)}
                    </p>
                    <p className="sd-found-item-status">
                      Status:{" "}
                      <Badge variant={foundItem.status === "active" ? "success" : "neutral"}>
                        {foundItem.status || "active"}
                      </Badge>
                      {foundItem.returnedCount > 0 && (
                        <span className="returned-count-badge">
                          🔄 {foundItem.returnedCount} returned
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="sd-toggle-section">
                  <div className="sd-toggle-row">
                    <span className="sd-toggle-label">Active Status (All Units)</span>
                    <ToggleSwitch
                      isOn={foundItem.status !== "inactive"}
                      onToggle={() => {
                        handleToggleAllUnits(foundItem.refNo, foundItem.status);
                      }}
                    />
                  </div>
                </div>

                {/* ⭐ Show individual units for found item */}
                {foundItem.units.length > 1 && (
                  <div className="sd-units-list">
                    <h4>Individual Units ({foundItem.units.length})</h4>
                    <table className="sd-units-table">
                      <thead>
                        <tr>
                          <th>Unit ID</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {foundItem.units.map((unit) => (
                          <tr key={unit.id}>
                            <td className="sd-mono">{unit.id}</td>
                            <td>
                              {unit.isReturned ? (
                                <span className="stock-type-badge returned">🔄 Returned</span>
                              ) : (
                                <span className="stock-type-badge fresh">📦 Fresh</span>
                              )}
                            </td>
                            <td>
                              <Badge variant={unit.status === "active" ? "success" : "neutral"}>
                                {unit.status || "active"}
                              </Badge>
                            </td>
                            <td>
                              <ToggleSwitch
                                isOn={unit.status !== "inactive"}
                                onToggle={() => handleToggleUnitStatus(unit.id, foundItem.refNo)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="stock-handle__card">
          <div className="sd-table-header">
            <div>
              <h3 className="sd-section-title">All Items</h3>
              <p className="sd-section-subtitle">
                Browse inventory items and toggle status. Click <strong>▶</strong> to expand units.
              </p>
            </div>
            <div className="sd-table-search-wrapper">
              <Search size={15} strokeWidth={2.2} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search inventory"
                className="sd-table-search-input"
              />
            </div>
          </div>

          <div className="sd-table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Returned</th>
                  <th>Status</th>
                  <th className="sd-actions-head">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="sd-empty">
                      No items match your search.
                    </td>
                  </tr>
                ) : (
                  pagedInventory.map((item) => {
                    const isActive = item.status !== "inactive";
                    const isExpanded = expandedRows[item.refNo] || false;
                    const showUnits = item.units && item.units.length > 1;

                    return (
                      <>
                        {/* Main Row */}
                        <tr key={item.refNo} className="sd-main-row">
                          <td>
                            {showUnits && (
                              <button
                                className="sd-expand-btn"
                                onClick={() => toggleExpand(item.refNo)}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </td>
                          <td className="sd-mono">{item.refNo}</td>
                          <td className="sd-product">{item.productName}</td>
                          <td>
                            <Badge variant="primary">{item.category}</Badge>
                          </td>
                          <td>
                            <span className={`sd-quantity ${item.quantity <= 10 ? "sd-quantity-low" : ""}`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td>
                            {item.returnedCount > 0 ? (
                              <span className="returned-badge">🔄 {item.returnedCount}</span>
                            ) : (
                              <span className="fresh-badge">📦 0</span>
                            )}
                          </td>
                          <td>
                            <Badge variant={isActive ? "success" : "neutral"}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td>
                            <div className="sd-action-cell">
                              <ToggleSwitch
                                isOn={isActive}
                                onToggle={() => {
                                  handleToggleAllUnits(item.refNo, item.status);
                                }}
                              />
                            </div>
                          </td>
                        </tr>

                        {/* ⭐ Expanded Units Row */}
                        {isExpanded && showUnits && (
                          <tr className="sd-expanded-row">
                            <td colSpan="8">
                              <div className="sd-expanded-content">
                                <h4>Individual Units ({item.units.length})</h4>
                                <table className="sd-units-table">
                                  <thead>
                                    <tr>
                                      <th>Unit ID</th>
                                      <th>Type</th>
                                      <th>Status</th>
                                      <th>Last Student</th>
                                      <th>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.units.map((unit) => {
                                      const history = getUnitHistory(unit.id);
                                      const lastStudent = history.length > 0 ? history[0].student : '—';
                                      return (
                                        <tr key={unit.id}>
                                          <td className="sd-mono">{unit.id}</td>
                                          <td>
                                            {unit.isReturned ? (
                                              <span className="stock-type-badge returned">🔄 Returned</span>
                                            ) : (
                                              <span className="stock-type-badge fresh">📦 Fresh</span>
                                            )}
                                          </td>
                                          <td>
                                            <Badge variant={unit.status === "active" ? "success" : "neutral"}>
                                              {unit.status || "active"}
                                            </Badge>
                                          </td>
                                          <td className="sd-mono">{lastStudent}</td>
                                          <td>
                                            <ToggleSwitch
                                              isOn={unit.status !== "inactive"}
                                              onToggle={() => handleToggleUnitStatus(unit.id, item.refNo)}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>
    </>
  );
}