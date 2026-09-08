import { useState, useMemo, useEffect, useRef } from "react";
import { Download, Package, Users, ClipboardList, Boxes } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./css/Reports.css";

const CATEGORIES = ["All Categories", "implant", "abutment", "prosthetic", "general"];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function Reports() {
  const onMenuClick = useMenuClick();
  const { stock = [], issuedItems = [], returns = [] } = useInventory();
  const { students = [] } = useData();
  const reportRef = useRef(null);

  const [reportType, setReportType] = useState("stock");
  const [category, setCategory] = useState("All Categories");
  const [dateRange, setDateRange] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Set default date range
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().slice(0, 10));
    setEndDate(lastDay.toISOString().slice(0, 10));
  }, []);

  // Filtered data
  const filteredData = useMemo(() => {
    let filtered = [...stock];
    
    if (category !== "All Categories") {
      filtered = filtered.filter(s => s.category?.toLowerCase() === category.toLowerCase());
    }
    
    return filtered;
  }, [stock, category]);

  // Stock summary data
  const stockSummary = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      const key = item.refNo || item.id;
      if (!grouped[key]) {
        grouped[key] = {
          refNo: key,
          productName: item.productName || item.product || "Product",
          category: item.category || "General",
          company: item.company || item.companyName || "—",
          lotNo: item.lotNo || "—",
          totalQuantity: 0,
          freshCount: 0,
          returnedCount: 0,
          location: item.freshLocation || item.location || "—",
          threshold: item.lowStockThreshold || 10,
        };
      }
      const qty = item.quantity || item.qty || 1;
      grouped[key].totalQuantity += qty;
      if (item.isReturned || item.isReturnedFromStudent) {
        grouped[key].returnedCount += qty;
      } else {
        grouped[key].freshCount += qty;
      }
    });
    return Object.values(grouped);
  }, [filteredData]);

  // Issued items data
  const issuedData = useMemo(() => {
    let items = issuedItems.filter(i => i.status === "Active" || i.status === "active");
    
    if (startDate && endDate) {
      items = items.filter(i => {
        const date = i.issueDate || i.date || i.issuedDate;
        return date && date >= startDate && date <= endDate;
      });
    }
    
    return items;
  }, [issuedItems, startDate, endDate]);

  // Returned items data
  const returnedData = useMemo(() => {
    let items = issuedItems.filter(i => i.status === "Returned" || i.status === "returned");
    
    if (startDate && endDate) {
      items = items.filter(i => {
        const date = i.returnDate || i.date;
        return date && date >= startDate && date <= endDate;
      });
    }
    
    return items;
  }, [issuedItems, startDate, endDate]);

  // Summary stats
  const summaryStats = useMemo(() => {
    return {
      totalProducts: stockSummary.length,
      totalUnits: stockSummary.reduce((sum, s) => sum + s.totalQuantity, 0),
      totalIssued: issuedItems.filter(i => i.status === "Active" || i.status === "active").length,
      totalReturned: issuedItems.filter(i => i.status === "Returned" || i.status === "returned").length,
      totalStudents: students.filter(s => s.status === "active").length,
    };
  }, [stockSummary, issuedItems, students]);

  // Generate PDF using jsPDF + html2canvas with multi-page portrait slicing
  const generatePDF = async () => {
    setIsGenerating(true);
    const element = reportRef.current;
    if (!element) {
      toast.error("Report content not found");
      setIsGenerating(false);
      return;
    }

    try {
      // ⭐ Temporarily force light mode styles for crisp white paper PDF export
      element.classList.add("force-light-print");

      // Render element to high-res canvas (scale: 2 for crisp vector text)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: "#ffffff",
      });

      // Initialize A4 Portrait PDF (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Canvas dimensions with scale: 2 accounted for automatically
      const totalCanvasHeight = canvas.height;
      const pageHeightCanvasPx = Math.floor(canvas.width * (pdfHeight / pdfWidth));
      const totalPages = Math.max(1, Math.ceil(totalCanvasHeight / pageHeightCanvasPx));

      let srcY = 0;
      let pageNum = 1;

      while (srcY < totalCanvasHeight) {
        const currentSliceHeight = Math.min(pageHeightCanvasPx, totalCanvasHeight - srcY);

        // Create a single-page slice canvas
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageHeightCanvasPx;

        const ctx = pageCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        // Copy vertical slice from main canvas
        ctx.drawImage(
          canvas,
          0, srcY, canvas.width, currentSliceHeight, // Source sub-rectangle
          0, 0, canvas.width, currentSliceHeight      // Destination sub-rectangle
        );

        const pageImgData = pageCanvas.toDataURL("image/png");

        if (pageNum > 1) {
          pdf.addPage("a4", "portrait");
        }

        // Render full page to PDF without shrinking or stretching
        pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, pdfHeight);

        // Page footer numbering
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pdfWidth - 28, pdfHeight - 6);

        srcY += pageHeightCanvasPx;
        pageNum++;
      }

      pdf.save(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Portrait PDF report generated successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF: " + (error.message || "Unknown error"));
    } finally {
      if (element) {
        element.classList.remove("force-light-print");
      }
      setIsGenerating(false);
    }
  };

  // Render report content based on type
  const renderReportContent = () => {
    switch (reportType) {
      case "stock":
        return (
          <>
            <h3>Stock Summary Report</h3>
            <p>Total Products: {stockSummary.length} | Total Units: {summaryStats.totalUnits}</p>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Company</th>
                  <th>Lot No</th>
                  <th>Fresh</th>
                  <th>Returned</th>
                  <th>Total</th>
                  <th>Location</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.map((item) => (
                  <tr key={item.refNo}>
                    <td>{item.refNo}</td>
                    <td>{item.productName}</td>
                    <td><span className="category-tag">{item.category}</span></td>
                    <td>{item.company}</td>
                    <td>{item.lotNo}</td>
                    <td>{item.freshCount}</td>
                    <td>{item.returnedCount}</td>
                    <td><strong>{item.totalQuantity}</strong></td>
                    <td>{item.location}</td>
                    <td>{item.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );

      case "issued":
        return (
          <>
            <h3>Issued Items Report</h3>
            <p>Total Issued: {issuedData.length} items</p>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Issue ID</th>
                  <th>Student</th>
                  <th>Product</th>
                  <th>Unit ID</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {issuedData.map((item) => (
                  <tr key={item.issueId}>
                    <td>{item.issueId}</td>
                    <td>{item.student || item.studentName}</td>
                    <td>{item.product || item.productName}</td>
                    <td>{item.unitId || item.inventoryId || "—"}</td>
                    <td>{formatDate(item.issueDate || item.date || item.issuedDate)}</td>
                    <td><span className="status-badge active">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );

      case "returned":
        return (
          <>
            <h3>Returned Items Report</h3>
            <p>Total Returned: {returnedData.length} items</p>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Issue ID</th>
                  <th>Student</th>
                  <th>Product</th>
                  <th>Unit ID</th>
                  <th>Return Date</th>
                  <th>Condition</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {returnedData.map((item) => (
                  <tr key={item.issueId}>
                    <td>{item.issueId}</td>
                    <td>{item.student || item.studentName}</td>
                    <td>{item.product || item.productName}</td>
                    <td>{item.unitId || item.inventoryId || "—"}</td>
                    <td>{formatDate(item.returnDate || item.date)}</td>
                    <td>{item.returnCondition || "Good"}</td>
                    <td><span className="status-badge returned">Returned</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DashboardHeader title="Reports" onMenuClick={onMenuClick} />

      <main className="reports-page">
        {/* Controls */}
        <div className="reports-controls">
          <div className="reports-controls-left">
            <div className="reports-control-group">
              <label>Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="stock">📦 Stock Summary</option>
                <option value="issued">📋 Issued Items</option>
                <option value="returned">🔄 Returned Items</option>
              </select>
            </div>

            <div className="reports-control-group">
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="reports-controls-right">
            <div className="reports-control-group">
              <label>Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  const now = new Date();
                  if (e.target.value === "current_month") {
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setStartDate(firstDay.toISOString().slice(0, 10));
                    setEndDate(lastDay.toISOString().slice(0, 10));
                  } else if (e.target.value === "last_30_days") {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setStartDate(d.toISOString().slice(0, 10));
                    setEndDate(now.toISOString().slice(0, 10));
                  } else if (e.target.value === "last_90_days") {
                    const d = new Date();
                    d.setDate(d.getDate() - 90);
                    setStartDate(d.toISOString().slice(0, 10));
                    setEndDate(now.toISOString().slice(0, 10));
                  }
                }}
              >
                <option value="current_month">Current Month</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
              </select>
            </div>

            <div className="reports-control-group">
              <label>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="reports-control-group">
              <label>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="reports-summary">
          <div className="summary-card">
            <div className="summary-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
              <Package size={20} />
            </div>
            <div>
              <p className="summary-label">Total Products</p>
              <p className="summary-value">{summaryStats.totalProducts}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ background: "#D1FAE5", color: "#059669" }}>
              <Boxes size={20} />
            </div>
            <div>
              <p className="summary-label">Total Units</p>
              <p className="summary-value">{summaryStats.totalUnits}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="summary-label">Issued Items</p>
              <p className="summary-value">{summaryStats.totalIssued}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ background: "#E0E7FF", color: "#4F46E5" }}>
              <Users size={20} />
            </div>
            <div>
              <p className="summary-label">Active Students</p>
              <p className="summary-value">{summaryStats.totalStudents}</p>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="reports-content" ref={reportRef}>
          <div className="reports-header">
            <h2>Dental Inventry - Inventory Report</h2>
            <p>
              Generated: {new Date().toLocaleString()} | 
              Category: {category} | 
              Period: {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>

          {renderReportContent()}

          <div className="reports-footer">
            <p>Generated by Dental Inventry Inventory System</p>
          </div>
        </div>

        <button
          className="reports-download-btn"
          onClick={generatePDF}
          disabled={isGenerating}
        >
          <Download size={18} />
          {isGenerating ? "Generating..." : "Download PDF"}
        </button>
      </main>
    </>
  );
}