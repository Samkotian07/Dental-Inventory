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

  const pendingCount = history.filter(
    (i) => i.status === "Active" || i.status?.toLowerCase() === "pending"
  ).length;

  return (
    <Modal title="Student Details & History" onClose={onClose} width={720}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#1F2937" }}>
          Student: <strong>{student.name}</strong> ({student.campusId || student.id})
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>
          Course: {student.course || "—"} | Semester: {student.semester || "—"} | Email: {student.email || "—"}
        </p>
      </div>

      <div style={{ marginTop: "12px" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#374151" }}>
          📋 Complete History:
        </h4>

        <div style={{ overflowX: "auto", border: "1px solid #E5E7EB", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
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
                  <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#9CA3AF" }}>
                    No issue history found for this student.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const isReturned = row.status === "Returned";
                  const isCondemned = row.status === "Condemned";
                  const isPending = !isReturned && !isCondemned;

                  return (
                    <tr key={row.issueId || row.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
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
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: "#D1FAE5",
                              color: "#059669",
                              display: "inline-block",
                            }}
                          >
                            ✅ Returned
                          </span>
                        ) : isCondemned ? (
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: "#FEE2E2",
                              color: "#DC2626",
                              display: "inline-block",
                            }}
                          >
                            🗑️ Condemned
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: "#FEF3C7",
                              color: "#D97706",
                              display: "inline-block",
                            }}
                          >
                            ⚠️ PENDING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isReturned || isCondemned
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

        <div
          style={{
            marginTop: "16px",
            padding: "10px 14px",
            background: pendingCount > 0 ? "#FFFBEB" : "#F3F4F6",
            borderRadius: "6px",
            border: pendingCount > 0 ? "1px solid #F59E0B" : "1px solid #E5E7EB",
            color: pendingCount > 0 ? "#92400E" : "#4B5563",
            fontWeight: "600",
            fontSize: "13px",
          }}
        >
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
