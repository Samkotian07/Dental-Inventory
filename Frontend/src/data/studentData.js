// Students
export const students = [
  { id: "STU-1042", name: "John Doe", course: "Dental Surgery", semester: "Semester 5", added: "2024-01-15" },
  { id: "STU-1078", name: "Jane Smith", course: "Orthodontics", semester: "Semester 3", added: "2024-01-20" },
  { id: "STU-1091", name: "Michael Brown", course: "Dental Surgery", semester: "Semester 5", added: "2024-02-05" },
  { id: "STU-1103", name: "Emily Davis", course: "Periodontics", semester: "Semester 7", added: "2024-02-18" },
  { id: "STU-1114", name: "Chris Wilson", course: "Orthodontics", semester: "Semester 3", added: "2024-03-01" },
  { id: "STU-1129", name: "Sarah Miller", course: "Endodontics", semester: "Semester 6", added: "2024-03-15" },
  { id: "STU-1135", name: "Aisha Khan", course: "Prosthodontics", semester: "Semester 2", added: "2024-03-22" },
  { id: "STU-1147", name: "Rahul Nair", course: "Pedodontics", semester: "Semester 4", added: "2024-04-02" },
];

// Issued Items
export const issuedItems = [
  {
    issueId: "ISS-001",
    studentId: "STU-1042",
    student: "John Doe",
    product: "Dental X-Ray Film",
    lotNo: "LOT-2024-001",
    refNo: "INV-001",
    qty: 2,
    date: "Jun 10, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-002",
    studentId: "STU-1078",
    student: "Jane Smith",
    product: "Surgical Gloves",
    lotNo: "LOT-2024-002",
    refNo: "INV-002",
    qty: 1,
    date: "Jun 12, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-003",
    studentId: "STU-1091",
    student: "Michael Brown",
    product: "Composite Resin",
    lotNo: "LOT-2024-004",
    refNo: "INV-004",
    qty: 3,
    date: "Jun 15, 2024",
    returnDate: "Jun 20, 2024",
    status: "Returned",
  },
  {
    issueId: "ISS-004",
    studentId: "STU-1103",
    student: "Emily Davis",
    product: "Orthodontic Brackets",
    lotNo: "LOT-2024-007",
    refNo: "INV-007",
    qty: 10,
    date: "Jun 18, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-005",
    studentId: "STU-1114",
    student: "Chris Wilson",
    product: "Mouth Mirror",
    lotNo: "LOT-2024-008",
    refNo: "INV-008",
    qty: 5,
    date: "Jun 22, 2024",
    returnDate: "Jun 27, 2024",
    status: "Returned",
  },
  {
    issueId: "ISS-006",
    studentId: "STU-1129",
    student: "Sarah Miller",
    product: "Cotton Rolls",
    lotNo: "LOT-2024-011",
    refNo: "INV-011",
    qty: 20,
    date: "Jul 05, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-007",
    studentId: "STU-1135",
    student: "Aisha Khan",
    product: "Dental Floss",
    lotNo: "LOT-2024-005",
    refNo: "INV-005",
    qty: 4,
    date: "Jul 08, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-008",
    studentId: "STU-1147",
    student: "Rahul Nair",
    product: "Impression Tray",
    lotNo: "LOT-2024-006",
    refNo: "INV-011",
    qty: 6,
    date: "Jul 09, 2024",
    returnDate: "Jul 14, 2024",
    status: "Returned",
  },
  {
    issueId: "ISS-009",
    studentId: "STU-1042",
    student: "John Doe",
    product: "Surgical Gloves",
    lotNo: "LOT-2024-002",
    refNo: "INV-002",
    qty: 2,
    date: "Jul 10, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-010",
    studentId: "STU-1078",
    student: "Jane Smith",
    product: "Cotton Rolls",
    lotNo: "LOT-2024-011",
    refNo: "INV-011",
    qty: 15,
    date: "Jul 11, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-011",
    studentId: "STU-1091",
    student: "Michael Brown",
    product: "Dental X-Ray Film",
    lotNo: "LOT-2024-001",
    refNo: "INV-001",
    qty: 1,
    date: "Jul 12, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-012",
    studentId: "STU-1103",
    student: "Emily Davis",
    product: "Mouth Mirror",
    lotNo: "LOT-2024-008",
    refNo: "INV-008",
    qty: 3,
    date: "Jul 13, 2024",
    returnDate: "Jul 15, 2024",
    status: "Returned",
  },
  {
    issueId: "ISS-013",
    studentId: "STU-1114",
    student: "Chris Wilson",
    product: "Composite Resin",
    lotNo: "LOT-2024-004",
    refNo: "INV-004",
    qty: 2,
    date: "Jul 14, 2024",
    returnDate: null,
    status: "Active",
  },
  {
    issueId: "ISS-014",
    studentId: "STU-1129",
    student: "Sarah Miller",
    product: "Orthodontic Brackets",
    lotNo: "LOT-2024-007",
    refNo: "INV-007",
    qty: 8,
    date: "Jul 15, 2024",
    returnDate: null,
    status: "Active",
  },
];

// Exchange Items
export const exchangeItems = [
  {
    exchangeId: "EXC-001",
    studentId: "STU-1042",
    student: "John Doe",
    refNo: "INV-002",
    creditNo: "CR-2024-001",
    reason: "Defective product",
    date: "Jun 12, 2024",
    status: "Pending",
  },
  {
    exchangeId: "EXC-002",
    studentId: "STU-1078",
    student: "Jane Smith",
    refNo: "INV-004",
    creditNo: "CR-2024-002",
    reason: "Wrong size received",
    date: "Jun 18, 2024",
    status: "Completed",
  },
  {
    exchangeId: "EXC-003",
    studentId: "STU-1091",
    student: "Michael Brown",
    refNo: "INV-007",
    creditNo: "CR-2024-003",
    reason: "Expired product",
    date: "Jun 25, 2024",
    status: "Rejected",
  },
  {
    exchangeId: "EXC-004",
    studentId: "STU-1103",
    student: "Emily Davis",
    refNo: "INV-008",
    creditNo: "CR-2024-004",
    reason: "Damaged packaging",
    date: "Jul 02, 2024",
    status: "Pending",
  },
  {
    exchangeId: "EXC-005",
    studentId: "STU-1114",
    student: "Chris Wilson",
    refNo: "INV-011",
    creditNo: "CR-2024-005",
    reason: "Wrong item issued",
    date: "Jul 05, 2024",
    status: "Completed",
  },
  {
    exchangeId: "EXC-006",
    studentId: "STU-1129",
    student: "Sarah Miller",
    refNo: "INV-002",
    creditNo: "CR-2024-006",
    reason: "Defective product",
    date: "Jul 08, 2024",
    status: "Pending",
  },
  {
    exchangeId: "EXC-007",
    studentId: "STU-1042",
    student: "John Doe",
    refNo: "INV-004",
    creditNo: "CR-2024-007",
    reason: "Wrong size received",
    date: "Jul 09, 2024",
    status: "Rejected",
  },
  {
    exchangeId: "EXC-008",
    studentId: "STU-1078",
    student: "Jane Smith",
    refNo: "INV-007",
    creditNo: "CR-2024-008",
    reason: "Damaged packaging",
    date: "Jul 11, 2024",
    status: "Completed",
  },
  {
    exchangeId: "EXC-009",
    studentId: "STU-1091",
    student: "Michael Brown",
    refNo: "INV-008",
    creditNo: "CR-2024-009",
    reason: "Expired product",
    date: "Jul 13, 2024",
    status: "Pending",
  },
];

// Inventory
export const inventory = [
  { id: "INV-001", refNo: "INV-001", productName: "Dental X-Ray Film", category: "XYXX", companyName: "Dental Supplies Co.", size: "10x12", lotNo: "LOT-2024-001", quantity: 42, expiryDate: "2026-12-31", lowStockThreshold: 10 },
  { id: "INV-002", refNo: "INV-002", productName: "Surgical Gloves", category: "CONSUMABLES", companyName: "MedTech Inc.", size: "M", lotNo: "LOT-2024-002", quantity: 8, expiryDate: "2027-01-15", lowStockThreshold: 15 },
  { id: "INV-003", refNo: "INV-003", productName: "Dental Drill", category: "EQUIPMENT", companyName: "DuraPro", size: "Standard", lotNo: "LOT-2024-003", quantity: 14, expiryDate: "2027-05-20", lowStockThreshold: 5 },
  { id: "INV-004", refNo: "INV-004", productName: "Composite Resin", category: "XYXX", companyName: "Dental Supplies Co.", size: "4g", lotNo: "LOT-2024-004", quantity: 30, expiryDate: "2026-11-30", lowStockThreshold: 10 },
  { id: "INV-005", refNo: "INV-005", productName: "Dental Floss", category: "CONSUMABLES", companyName: "OralCare Ltd.", size: "50m", lotNo: "LOT-2024-005", quantity: 5, expiryDate: "2027-08-15", lowStockThreshold: 10 },
  { id: "INV-006", refNo: "INV-006", productName: "UV Sterilizer", category: "EQUIPMENT", companyName: "MedTech Inc.", size: "Large", lotNo: "LOT-2024-006", quantity: 3, expiryDate: "2028-01-10", lowStockThreshold: 3 },
  { id: "INV-007", refNo: "INV-007", productName: "Orthodontic Brackets", category: "XYXX", companyName: "DuraPro", size: "Standard", lotNo: "LOT-2024-007", quantity: 58, expiryDate: "2027-09-01", lowStockThreshold: 15 },
  { id: "INV-008", refNo: "INV-008", productName: "Mouth Mirror", category: "CONSUMABLES", companyName: "OralCare Ltd.", size: "No.5", lotNo: "LOT-2024-008", quantity: 25, expiryDate: "2027-02-28", lowStockThreshold: 10 },
  { id: "INV-009", refNo: "INV-009", productName: "Etching Gel", category: "CONSUMABLES", companyName: "MedTech Inc.", size: "3ml", lotNo: "LOT-2024-009", quantity: 2, expiryDate: "2026-10-15", lowStockThreshold: 5 },
  { id: "INV-010", refNo: "INV-010", productName: "Suction Unit", category: "EQUIPMENT", companyName: "DuraPro", size: "Standard", lotNo: "LOT-2024-010", quantity: 7, expiryDate: "2027-12-01", lowStockThreshold: 5 },
  { id: "INV-011", refNo: "INV-011", productName: "Impression Tray", category: "XYXX", companyName: "Dental Supplies Co.", size: "Medium", lotNo: "LOT-2024-011", quantity: 19, expiryDate: "2027-04-15", lowStockThreshold: 10 },
  { id: "INV-012", refNo: "INV-012", productName: "Autoclave", category: "EQUIPMENT", companyName: "MedTech Inc.", size: "18L", lotNo: "LOT-2024-012", quantity: 4, expiryDate: "2028-06-30", lowStockThreshold: 2 },
  { id: "INV-013", refNo: "INV-013", productName: "Cotton Rolls", category: "CONSUMABLES", companyName: "OralCare Ltd.", size: "Pack/50", lotNo: "LOT-2024-013", quantity: 120, expiryDate: "2027-11-20", lowStockThreshold: 20 },
  { id: "INV-014", refNo: "INV-014", productName: "Bonding Agent", category: "XYXX", companyName: "DuraPro", size: "5ml", lotNo: "LOT-2024-014", quantity: 16, expiryDate: "2026-08-31", lowStockThreshold: 5 },
];

// Categories
export const categories = ["All Categories", "XYXX", "CONSUMABLES", "EQUIPMENT"];

// Inventory Options
export const inventoryOptions = [
  { id: "INV-001", product: "Dental X-Ray Film" },
  { id: "INV-002", product: "Surgical Gloves" },
  { id: "INV-004", product: "Composite Resin" },
  { id: "INV-005", product: "Dental Floss" },
  { id: "INV-007", product: "Orthodontic Brackets" },
  { id: "INV-008", product: "Mouth Mirror" },
  { id: "INV-011", product: "Impression Tray" },
  { id: "INV-013", product: "Cotton Rolls" },
];

// Courses
export const courses = [
  "Dental Surgery",
  "Orthodontics",
  "Periodontics",
  "Endodontics",
  "Prosthodontics",
  "Pedodontics",
];

// Semesters
export const semesters = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8",
];

// Student Items
export const studentItems = [
  { campusId: "CS123", name: "John Doe", course: "Dental Surgery", semester: "Semester 5", added: "2024-01-15" },
  { campusId: "CS124", name: "Jane Smith", course: "Orthodontics", semester: "Semester 3", added: "2024-01-20" },
  { campusId: "CS125", name: "Michael Brown", course: "Dental Surgery", semester: "Semester 5", added: "2024-02-05" },
  { campusId: "CS126", name: "Emily Davis", course: "Periodontics", semester: "Semester 7", added: "2024-02-18" },
  { campusId: "CS127", name: "Chris Wilson", course: "Orthodontics", semester: "Semester 3", added: "2024-03-01" },
  { campusId: "CS128", name: "Sarah Miller", course: "Endodontics", semester: "Semester 6", added: "2024-03-15" },
  { campusId: "CS129", name: "Aisha Khan", course: "Prosthodontics", semester: "Semester 2", added: "2024-03-22" },
  { campusId: "CS130", name: "Rahul Nair", course: "Pedodontics", semester: "Semester 4", added: "2024-04-02" },
];

// Low Stock Alerts
export const lowStockAlerts = [
  { id: "INV-002", product: "Surgical Gloves", left: 8 },
  { id: "INV-005", product: "Dental Floss", left: 5 },
  { id: "INV-006", product: "UV Sterilizer", left: 3 },
  { id: "INV-009", product: "Etching Gel", left: 2 },
  { id: "INV-010", product: "Suction Unit", left: 7 },
];

// Category Distribution
export const categoryDistribution = [
  { name: "CONSUMABLES", value: 5, color: "#141416" },
  { name: "EQUIPMENT", value: 4, color: "#75787F" },
  { name: "XYXX", value: 5, color: "#B7B9BD" },
];

// Monthly Trends
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

// Daily Activity
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

// Stats
export const stats = [
  { key: "total", label: "Total Items", value: 619, tone: "blue" },
  { key: "low", label: "Low Stock", value: 6, tone: "amber" },
  { key: "expiring", label: "Expiring Soon", value: 0, tone: "red" },
  { key: "issued", label: "Issued (Active)", value: 4, tone: "green" },
];

// DEFAULT EXPORT - Single export at the end
export default {
  students,
  issuedItems,
  exchangeItems,
  inventory,
  categories,
  inventoryOptions,
  courses,
  semesters,
  studentItems,
  lowStockAlerts,
  categoryDistribution,
  monthlyTrends,
  dailyActivity,
  stats,
};