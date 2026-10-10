import { useEffect, useMemo, useState } from "react";
import { Search, Download, Eye, Pencil, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ItemDetailsModal from "../components/stock/ItemDetailsModal.jsx";
import EditItemModal from "../components/stock/EditItemModal.jsx";
import DeleteItemModal from "../components/stock/DeleteItemModal.jsx";
import ToggleSwitch from "../components/common/ToggleSwitch.jsx";
import { CATEGORIES as categories, normalizeCategory, isCategoryMatch } from "../components/utils/constants.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useInventory } from "../context/InventoryContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import "./css/Stock.css";

const CSV_COLUMNS = [
  { key: "refNo", label: "Ref No" },
  { key: "category", label: "Category" },
  { key: "company", label: "Company" },
  { key: "product", label: "Product" },
  { key: "size", label: "Size" },
  { key: "quantity", label: "Quantity" },
  { key: "returnedDisplay", label: "Returned" },
];

export default function Stock() {
  const navigate = useNavigate();
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const canWrite = user?.role !== 'readonly';
  const isAdmin = user?.role === 'admin';

  const {
    stock: rows,
    moveToFailed,
    getLotsForRef,
    receiveStock,
    updateLotQuantity,
    toggleStockStatus,
  } = useInventory();

  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
    setPage(1);
  }, [searchParams]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    categories.forEach((c) => {
      if (c && c !== "All Categories") set.add(c);
    });
    (rows || []).forEach((r) => {
      if (r.category && r.lotNo && String(r.lotNo).trim() !== "" && Number(r.quantity ?? r.qty ?? 0) > 0) {
        set.add(normalizeCategory(r.category));
      }
    });
    return ["All Categories", ...Array.from(set)];
  }, [rows]);

  // ⭐ Group by base ref_no (one row per product) and aggregate lots + total quantity
  const filtered = useMemo(() => {
    let q = query.trim().toLowerCase();
    if (q.includes("/unit-history/")) {
      q = q.split("/unit-history/").pop().split("?")[0].split("#")[0];
    } else if (q.includes("/scan/")) {
      q = q.split("/scan/").pop().split("?")[0].split("#")[0];
    }

    // 1. Group active stock lots by product (refNo)
    const groupedMap = {};
    (rows || []).forEach((r) => {
      if (!r.lotNo || String(r.lotNo).trim() === "") return;
      const unitQty = Number(r.quantity ?? r.qty ?? 0);
      if (unitQty <= 0) return;

      const baseRef = r.refNo || r.id || "";
      if (!baseRef) return;

      if (!groupedMap[baseRef]) {
        groupedMap[baseRef] = {
          ...r,
          refNo: baseRef,
          quantity: 0,
          qty: 0,
          freshStock: 0,
          returnedStock: 0,
          returnedCount: 0,
          units: [],
          lots: [],
          lotNumbers: [],
        };
      }

      groupedMap[baseRef].quantity += unitQty;
      groupedMap[baseRef].qty += unitQty;

      // Count returned units
      const retQty = Number(r.returnedStock ?? r.qtyReturned ?? r.returnedCount ?? (r.isReturned === true ? unitQty : 0));
      groupedMap[baseRef].returnedCount += retQty;
      groupedMap[baseRef].returnedStock = groupedMap[baseRef].returnedCount;
      groupedMap[baseRef].freshStock += Number(r.freshStock ?? Math.max(0, unitQty - retQty));
      groupedMap[baseRef].units.push(r.id);

      const lotNoStr = String(r.lotNo || "").trim();
      if (lotNoStr && !groupedMap[baseRef].lotNumbers.includes(lotNoStr)) {
        groupedMap[baseRef].lotNumbers.push(lotNoStr);
      }

      groupedMap[baseRef].lots.push({
        ...r,
        lotId: r.lotId || r.id,
        lotNo: lotNoStr,
        quantity: unitQty,
        qty: unitQty,
      });
    });

    // 2. Filter by Category and Search Query
    let list = Object.values(groupedMap)
      .map((item) => {
        const retCount = Number(item.returnedCount ?? item.returnedStock ?? 0);
        return {
          ...item,
          lotNo: item.lotNumbers.join(", "),
          returnedDisplay: retCount > 0 ? retCount : "Fresh",
        };
      })
      .filter((item) => {
        if (Number(item.quantity ?? item.qty ?? 0) <= 0) return false;
        if (!isCategoryMatch(item.category, category)) return false;
        if (!q) return true;

        return (
          (item.product || "").toLowerCase().includes(q) ||
          (item.company || "").toLowerCase().includes(q) ||
          (item.refNo || "").toLowerCase().includes(q) ||
          (item.size || "").toLowerCase().includes(q) ||
          (item.lotNo || "").toLowerCase().includes(q) ||
          item.lotNumbers.some((lot) => lot.toLowerCase().includes(q))
        );
      });

    // 3. Sort
    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [rows, query, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`stock-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleSaveEdit = async (item, patch) => {
    const newQty = Number(patch.qty);
    if (!newQty || newQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (!patch.reason || !patch.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const result = await updateLotQuantity(item.lotId || item.id, newQty, patch.reason.trim());
    if (result.success) {
      toast.success(result.data?.delta === 0 ? "No change" : `Quantity updated to ${newQty}`);
      return true;
    } else {
      toast.error(result.message || "Failed to update quantity");
      return false;
    }
  };

  const handleAddLots = async (product, lots) => {
    for (const lot of lots) {
      const result = await receiveStock({
        ref_no: product.refNo,
        lot_no: lot.lotNo.trim(),
        quantity: Number(lot.quantity),
        invoice_no: lot.invoiceNo.trim() || null,
        credit_note_no: lot.creditNoteNo.trim() || null,
        expiry_date: lot.expiryDate || null,
        product_name: product.productName || product.product,
        category: product.category,
        size: product.size,
        company_name: product.companyName || product.company,
      });
      if (!result.success) {
        toast.error(result.message || "Failed to add stock");
        return false;
      }
    }
    toast.success(`${lots.length} lot${lots.length === 1 ? "" : "s"} added`);
    return true;
  };

  const handleConfirmDelete = async (item, options) => {
    const qtyRequested = Number(options?.quantity ?? 1);
    const reason = options?.reason || "Damaged";

    let failureType = "damaged";
    const rLower = reason.toLowerCase();
    if (rLower.includes("expire")) failureType = "expired";
    else if (rLower.includes("qualit")) failureType = "quality_fail";
    else if (rLower.includes("condemn")) failureType = "condemned";

    let lots = (item?.lots && item.lots.length > 0)
      ? item.lots.map(l => ({ lotId: l.lotId, qtyAvailable: Number(l.quantity ?? l.qty ?? 0) }))
      : (item?.lotId
          ? [{ lotId: item.lotId, qtyAvailable: Number(item.quantity ?? item.qty ?? 0) }]
          : await getLotsForRef(item?.refNo || item?.id));

    if (!lots || lots.length === 0) {
      toast.error("No active lots found for this product to move to failed");
      setDeleteItem(null);
      return;
    }

    let remainingToMove = qtyRequested;
    let successCount = 0;

    for (const lot of lots) {
      if (remainingToMove <= 0) break;
      const lotQty = Number(lot.qtyAvailable ?? lot.quantity ?? 0);
      if (lotQty <= 0) continue;
      const moveQty = Math.min(lotQty, remainingToMove);

      const result = await moveToFailed({
        lotId: lot.lotId,
        quantity: moveQty,
        failureType,
        failureReason: reason,
      });

      if (result.success) {
        successCount += moveQty;
        remainingToMove -= moveQty;
      }
    }

    if (successCount > 0) {
      toast.success(`Moved ${successCount} unit(s) to Failed Inventory`);
    } else {
      toast.error("Failed to move item(s) to Failed Inventory");
    }
    setDeleteItem(null);
  };

  const handleToggleStockStatus = async (row) => {
    const refNo = row.refNo || row.id;
    const isActive = row.status !== "inactive" && row.isActive !== false;
    const targetStatus = isActive ? "inactive" : "active";
    const result = await toggleStockStatus(refNo, targetStatus);

    if (result.success) {
      toast.success(`${row.product || "Stock item"} ${targetStatus === "active" ? "enabled" : "disabled"}`);
    } else {
      toast.error(result.message || "Failed to update stock status");
    }
  };

  const columns = [
    { key: "refNo", label: "Ref No", align: "left" },
    { key: "category", label: "Category", align: "left" },
    { key: "company", label: "Company", align: "left" },
    { key: "product", label: "Product", align: "left" },
    { key: "size", label: "Size", align: "left" },
    { key: "quantity", label: "Quantity", align: "center" },
    { key: "returnedCount", label: "Returned", align: "center" },
  ];

  return (
    <>
      <DashboardHeader title="Stock" onMenuClick={onMenuClick} />

      <main className="stock">
        <div className="stock__toolbar">
          <div className="stock__filters">
            <div className="stock__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by product, company, ref no, or lot..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    let val = query.trim();
                    if (val.includes("/unit-history/")) {
                      val = val.split("/unit-history/").pop().split("?")[0].split("#")[0];
                    } else if (val.includes("/scan/")) {
                      val = val.split("/scan/").pop().split("?")[0].split("#")[0];
                    }
                    if (val) {
                      navigate(`/unit-history/${encodeURIComponent(val)}`);
                    }
                  }
                }}
              />
            </div>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button className="stock__btn" onClick={handleExport}>
            <Download size={15} strokeWidth={2.2} />
            Export
          </button>
        </div>

        <section className="card stock__card">
          <div className="stock__scroll">
            <table className="stock__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={c.align === "center" ? "stock__th--center" : c.align === "right" ? "stock__th--right" : ""}
                    >
                      <button
                        className={`stock__sort ${c.align === "center" ? "stock__sort--center" : c.align === "right" ? "stock__sort--right" : ""}`}
                        onClick={() => toggleSort(c.key)}
                        title={c.key === "returnedCount" ? "Shows how many returned units" : undefined}
                      >
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="stock__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="stock__empty">
                      No stock items match your search or filter.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr
                    key={row.refNo || row.lotId || row.id}
                    className={row.status === "inactive" || row.isActive === false ? "stock__row--inactive" : ""}
                  >
                    <td className="stock__mono" data-label="Ref No">{row.refNo}</td>
                    <td data-label="Category">
                      <span className={`stock-tag stock-tag--${(row.category || "general").toLowerCase()}`}>
                        {row.category || "General"}
                      </span>
                    </td>
                    <td data-label="Company">{row.company}</td>
                    <td className="stock__strong" data-label="Product">{row.product}</td>
                    <td data-label="Size">{row.size || "—"}</td>
                    <td data-label="Quantity" className="stock__qty stock__td--center">
                      {row.quantity ?? row.qty ?? 0}
                    </td>
                    <td data-label="Returned" className="stock__td--center">
                      {Number(row.returnedCount ?? row.returnedStock ?? 0) > 0 ? (
                        <span className="returned-badge" title={`${row.returnedCount ?? row.returnedStock} returned unit(s)`}>
                          🔄 {row.returnedCount ?? row.returnedStock}
                        </span>
                      ) : (
                        <span className="fresh-badge" title="All units are fresh">
                          Fresh
                        </span>
                      )}
                    </td>
                    <td data-label="Actions" className="stock__td--actions">
                      <div className="stock__row-actions">
                        <button
                          className="stock__icon-btn"
                          onClick={() => setDetailItem(row)}
                          aria-label={`View ${row.refNo}`}
                          title="View details"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              className="stock__icon-btn"
                              onClick={() => setEditItem(row)}
                              aria-label={`Edit ${row.refNo}`}
                              title="Edit item"
                            >
                              <Pencil size={16} strokeWidth={2} />
                            </button>
                            <div className="stock__status-control">
                              <ToggleSwitch
                                isOn={row.status !== "inactive" && row.isActive !== false}
                                onToggle={() => handleToggleStockStatus(row)}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </section>
      </main>

      {detailItem && <ItemDetailsModal item={detailItem} onClose={() => setDetailItem(null)} />}

      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
          onDelete={canWrite ? () => {
            setDeleteItem(editItem);
            setEditItem(null);
          } : undefined}
          onAddLots={canWrite ? handleAddLots : undefined}
        />
      )}

      {deleteItem && (
        <DeleteItemModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

    </>
  );
}
