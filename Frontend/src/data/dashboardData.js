export const categories = ["All Categories", "XYXX", "CONSUMABLES", "EQUIPMENT"];

export const inventory = [
  { id: "INV-001", category: "XYXX", company: "Dental Supplies Co.", product: "Dental X-Ray Film", size: "10x12", qty: 42 },
  { id: "INV-002", category: "CONSUMABLES", company: "MedTech Inc.", product: "Surgical Gloves", size: "M", qty: 8 },
  { id: "INV-003", category: "EQUIPMENT", company: "DuraPro", product: "Dental Drill", size: "Standard", qty: 14 },
  { id: "INV-004", category: "XYXX", company: "Dental Supplies Co.", product: "Composite Resin", size: "4g", qty: 30 },
  { id: "INV-005", category: "CONSUMABLES", company: "OralCare Ltd.", product: "Dental Floss", size: "50m", qty: 5 },
  { id: "INV-006", category: "EQUIPMENT", company: "MedTech Inc.", product: "UV Sterilizer", size: "Large", qty: 3 },
  { id: "INV-007", category: "XYXX", company: "DuraPro", product: "Orthodontic Brackets", size: "Standard", qty: 58 },
  { id: "INV-008", category: "CONSUMABLES", company: "OralCare Ltd.", product: "Mouth Mirror", size: "No.5", qty: 25 },
  { id: "INV-009", category: "CONSUMABLES", company: "MedTech Inc.", product: "Etching Gel", size: "3ml", qty: 2 },
  { id: "INV-010", category: "EQUIPMENT", company: "DuraPro", product: "Suction Unit", size: "Standard", qty: 7 },
  { id: "INV-011", category: "XYXX", company: "Dental Supplies Co.", product: "Impression Tray", size: "Medium", qty: 19 },
  { id: "INV-012", category: "EQUIPMENT", company: "MedTech Inc.", product: "Autoclave", size: "18L", qty: 4 },
  { id: "INV-013", category: "CONSUMABLES", company: "OralCare Ltd.", product: "Cotton Rolls", size: "Pack/50", qty: 120 },
  { id: "INV-014", category: "XYXX", company: "DuraPro", product: "Bonding Agent", size: "5ml", qty: 16 },
];

export const lowStockAlerts = [
  { id: "INV-002", product: "Surgical Gloves", left: 8 },
  { id: "INV-005", product: "Dental Floss", left: 5 },
  { id: "INV-006", product: "UV Sterilizer", left: 3 },
  { id: "INV-009", product: "Etching Gel", left: 2 },
  { id: "INV-010", product: "Suction Unit", left: 7 },
];

export const categoryDistribution = [
  { name: "CONSUMABLES", value: 5, color: "#141416" },
  { name: "EQUIPMENT", value: 4, color: "#75787F" },
  { name: "XYXX", value: 5, color: "#B7B9BD" },
];

export const monthlyTrends = [
  { month: "Jan", added: 10, issued: 7 },
  { month: "Feb", added: 18, issued: 12 },
  { month: "Mar", added: 9, issued: 15 },
  { month: "Apr", added: 20, issued: 11 },
  { month: "May", added: 16, issued: 14 },
  { month: "Jun", added: 6, issued: 9 },
  { month: "Jul", added: 13, issued: 8 },
  { month: "Aug", added: 11, issued: 10 },
  { month: "Sep", added: 7, issued: 6 },
  { month: "Oct", added: 15, issued: 12 },
  { month: "Nov", added: 9, issued: 8 },
  { month: "Dec", added: 12, issued: 9 },
];

// Keyed by "YYYY-MM-DD" for July 2026 — drives the calendar day-detail view
export const dailyActivity = {
  "2026-07-02": {
    added: [{ id: "INV-013", product: "Cotton Rolls", qty: 40, company: "OralCare Ltd." }],
    issued: [{ id: "INV-004", product: "Composite Resin", qty: 3, to: "Dr. Rao — Ortho Dept" }],
  },
  "2026-07-06": {
    added: [],
    issued: [
      { id: "INV-002", product: "Surgical Gloves", qty: 12, to: "Student Clinic — Bay 3" },
      { id: "INV-009", product: "Etching Gel", qty: 1, to: "Dr. Menon — Restorative" },
    ],
  },
  "2026-07-09": {
    added: [{ id: "INV-007", product: "Orthodontic Brackets", qty: 20, company: "DuraPro" }],
    issued: [],
  },
  "2026-07-13": {
    added: [{ id: "INV-001", product: "Dental X-Ray Film", qty: 15, company: "Dental Supplies Co." }],
    issued: [{ id: "INV-005", product: "Dental Floss", qty: 6, to: "Student Clinic — Bay 1" }],
  },
  "2026-07-15": {
    added: [{ id: "INV-014", product: "Bonding Agent", qty: 10, company: "DuraPro" }],
    issued: [
      { id: "INV-002", product: "Surgical Gloves", qty: 4, to: "Student Clinic — Bay 2" },
      { id: "INV-006", product: "UV Sterilizer", qty: 1, to: "Sterilization Room" },
    ],
  },
};

export const stats = [
  { key: "total", label: "Total Items", value: 619, tone: "blue" },
  { key: "low", label: "Low Stock", value: 6, tone: "amber" },
  { key: "expiring", label: "Expiring Soon", value: 0, tone: "red" },
  { key: "issued", label: "Issued (Active)", value: 4, tone: "green" },
];
