import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Menu, Package, GraduationCap, ClipboardList, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import { useData } from "../context/DataContext.jsx";
import "./Topbar.css";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { stock = [], issuedItems = [], returns = [] } = useInventory();
  const { students = [] } = useData();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const includes = (...values) => values.some((value) => String(value ?? "").toLowerCase().includes(term));

    return [
      ...stock
        .filter((item) => includes(item.product, item.productName, item.company, item.refNo, item.lotNo, item.category))
        .slice(0, 4)
        .map((item) => ({
          type: "Stock",
          label: item.product || item.productName || item.refNo,
          detail: `${item.refNo || "No ref."}${item.company ? ` · ${item.company}` : ""}`,
          Icon: Package,
          to: `/stock?search=${encodeURIComponent(item.refNo || item.product || item.productName || query)}`,
        })),
      ...students
        .filter((student) => includes(student.name, student.id, student.campusId, student.email, student.course))
        .slice(0, 4)
        .map((student) => ({
          type: "Student",
          label: student.name || student.campusId || student.id,
          detail: student.campusId || student.id || student.email || "",
          Icon: GraduationCap,
          to: `/students?search=${encodeURIComponent(student.campusId || student.id || student.name || query)}`,
        })),
      ...issuedItems
        .filter((item) => includes(item.student, item.studentName, item.studentId, item.product, item.productName, item.issueId, item.refNo))
        .slice(0, 4)
        .map((item) => ({
          type: "Issued item",
          label: item.product || item.productName || item.issueId,
          detail: `${item.student || item.studentName || "Student"}${item.refNo ? ` · ${item.refNo}` : ""}`,
          Icon: ClipboardList,
          to: `/issued?search=${encodeURIComponent(item.issueId || item.refNo || item.product || query)}`,
        })),
      ...returns
        .filter((item) => includes(item.returnId, item.refNo, item.productName, item.product, item.reason, item.creditNote))
        .slice(0, 4)
        .map((item) => ({
          type: "Return / exchange",
          label: item.productName || item.product || item.returnId,
          detail: `${item.returnId || "Return"}${item.refNo ? ` · ${item.refNo}` : ""}`,
          Icon: Repeat,
          to: `/track-returns?search=${encodeURIComponent(item.returnId || item.refNo || item.productName || query)}`,
        })),
    ];
  }, [query, stock, students, issuedItems, returns]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const openResult = (result) => {
    navigate(result.to);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <header className="topbar">
      <button className="topbar__menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="topbar__search-wrap" ref={searchRef}>
        <div className="topbar__search">
        <Search size={16} strokeWidth={2.2} />
          <input
            type="search"
            placeholder="Search stock, students, or exchanges"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
              if (event.key === "Enter" && results[0]) openResult(results[0]);
            }}
            aria-label="Search inventory records"
            aria-expanded={isOpen && Boolean(query.trim())}
            aria-controls="topbar-search-results"
          />
        </div>

        {isOpen && query.trim() && (
          <div className="topbar__results" id="topbar-search-results" role="listbox">
            {results.length ? results.map((result, index) => {
              const Icon = result.Icon;
              return (
                <button key={`${result.type}-${result.label}-${index}`} className="topbar__result" onClick={() => openResult(result)} role="option">
                  <Icon size={16} aria-hidden="true" />
                  <span className="topbar__result-copy">
                    <span className="topbar__result-label">{result.label}</span>
                    <span className="topbar__result-detail">{result.type}{result.detail ? ` · ${result.detail}` : ""}</span>
                  </span>
                </button>
              );
            }) : <p className="topbar__no-results">No matching records found.</p>}
          </div>
        )}
      </div>

      <NotificationBell />
    </header>
  );
}
