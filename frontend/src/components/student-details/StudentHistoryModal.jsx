import { useMemo } from "react";
import Modal from "./Modal.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function StudentHistoryModal({ student, onClose }) {
  const { issuedItems = [] } = useInventory();

  const history = useMemo(() => {
    if (!student) return [];
    const sId = (student.campusId || student.id || "").toLowerCase();
    const sName = (student.name || "").toLowerCase();
    return issuedItems.filter((i) => {
      const matchId = (i.studentId || "").toLowerCase() === sId;
      const matchName = (i.studentName || i.student || "").toLowerCase() === sName;
      return matchId || matchName;
    });
  }, [issuedItems, student]);

  const pendingCount = history.filter((i) => {
    const isReturned = i.status?.toLowerCase() === "returned";
    const isCondemned = i.status?.toLowerCase() === "condemned";
    const isExchanged = i.status?.toLowerCase() === "vendor_exchange";
    const isImplantAbutment = Boolean(
      i.isImplantAbutment || i.is_implant_abutment ||
      i.category?.toLowerCase() === "implant" || i.category?.toLowerCase() === "abutment"
    );
    const isActive = !isReturned && !isCondemned && !isExchanged;
    return isActive && !isImplantAbutment;
  }).length;

  return (
    <Modal title="Student Details & History" onClose={onClose} width={720}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "var(--ink)" }}>
          Student: <strong>{student.name}</strong> ({student.campusId || student.id})
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-soft)" }}>
          Course: {student.course || "—"} | 
          Batch: {student.batch || "—"} | 
          Email: {student.email || "—"}
        </p>
      </div>

      <div style={{ marginTop: "12px" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--ink)" }}>
          📋 Complete History:
        </h4>

        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)", color: "var(--ink-soft)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Issue ID</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Ref No</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Quantity</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Return Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--ink-soft)" }}>
                    No issue history found for this student.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const isReturned = row.status?.toLowerCase() === "returned";
                  const isCondemned = row.status?.toLowerCase() === "condemned";
                  const isExchanged = row.status?.toLowerCase() === "vendor_exchange";
                  const isImplantAbutment = Boolean(
                    row.isImplantAbutment || row.is_implant_abutment ||
                    row.category?.toLowerCase() === "implant" || row.category?.toLowerCase() === "abutment"
                  );

                  return (
                    <tr key={row.issueId || row.id} style={{ borderBottom: "1px solid var(--line)", color: "var(--ink)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: "600" }}>
                        {row.issueId || row.id}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>
                        {row.refNo || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: "500" }}>
                        {row.product || row.productName}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {row.qty ?? row.quantity}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {isReturned ? (
                          <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: "rgba(16, 185, 129, 0.18)", color: "#34D399", display: "inline-block" }}>
                            ✅ Returned
                          </span>
                        ) : isCondemned ? (
                          <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: "rgba(239, 68, 68, 0.18)", color: "#F87171", display: "inline-block" }}>
                            🗑️ Condemned
                          </span>
                        ) : isExchanged ? (
                          <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: "rgba(139, 92, 246, 0.18)", color: "#A78BFA", display: "inline-block" }}>
                            🔄 Vendor Exchange
                          </span>
                        ) : isImplantAbutment ? (
                          <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: "rgba(37, 99, 235, 0.18)", color: "#60A5FA", display: "inline-block" }}>
                            📦 Issued (Placed)
                          </span>
                        ) : (
                          <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: "rgba(245, 158, 11, 0.18)", color: "#FBBF24", display: "inline-block" }}>
                            ⚠️ PENDING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isReturned || isCondemned || isExchanged
                          ? formatDate(row.returnDate || row.returnedDate || row.updatedAt || row.date)
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "16px", padding: "10px 14px", background: "var(--accent-soft)", borderRadius: "6px", border: "1px solid var(--line)", color: "var(--ink)", fontWeight: "600", fontSize: "13px" }}>
          ⚠️ Pending Returns: {pendingCount} {pendingCount === 1 ? "item" : "items"}
        </div>
      </div>

      <div className="modal__actions" style={{ marginTop: "20px" }}>
        <button className="modal__btn modal__btn--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}