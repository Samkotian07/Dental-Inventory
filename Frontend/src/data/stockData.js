export const categories = ["All Categories", "XYXX", "CONSUMABLES", "EQUIPMENT"];

function seedItem(num, category, company, product, size, qty, expiry, created) {
  const padded = String(num).padStart(3, "0");
  return {
    refNo: `INV-${padded}`,
    invoiceNo: `INV-2024-${padded}`,
    lotNo: `LOT-2024-${padded}`,
    category,
    company,
    product,
    size,
    qty,
    expiry, // ISO date string, e.g. "2025-12-31"
    created, // ISO date string
  };
}

export const stockItems = [
  seedItem(1, "XYXX", "Dental Supplies Co.", "Dental X-Ray Film", "10x12", 45, "2025-12-31", "2024-01-15"),
  seedItem(2, "CONSUMABLES", "MedTech Inc.", "Surgical Gloves", "M", 8, "2025-08-15", "2024-01-18"),
  seedItem(3, "EQUIPMENT", "DuraPro", "Dental Drill", "Standard", 12, "2027-06-01", "2024-01-22"),
  seedItem(4, "XYXX", "Dental Supplies Co.", "Composite Resin", "4g", 30, "2025-11-20", "2024-01-25"),
  seedItem(5, "CONSUMABLES", "OralCare Ltd.", "Dental Floss", "50m", 5, "2025-09-30", "2024-02-01"),
  seedItem(6, "EQUIPMENT", "MedTech Inc.", "UV Sterilizer", "Large", 3, "2028-01-15", "2024-02-06"),
  seedItem(7, "XYXX", "DuraPro", "Orthodontic Brackets", "Standard", 120, "2026-03-10", "2024-02-10"),
  seedItem(8, "CONSUMABLES", "OralCare Ltd.", "Mouth Mirror", "No.5", 60, "2027-08-22", "2024-02-14"),
  seedItem(9, "XYXX", "MedTech Inc.", "Etching Gel", "3ml", 18, "2026-05-01", "2024-02-19"),
  seedItem(10, "EQUIPMENT", "DuraPro", "Suction Unit", "Standard", 7, "2027-10-12", "2024-02-25"),
  seedItem(11, "XYXX", "Dental Supplies Co.", "Impression Tray", "Medium", 19, "2026-09-18", "2024-03-02"),
  seedItem(12, "EQUIPMENT", "MedTech Inc.", "Autoclave", "18L", 4, "2028-04-30", "2024-03-08"),
  seedItem(13, "CONSUMABLES", "OralCare Ltd.", "Cotton Rolls", "Pack/50", 120, "2026-12-01", "2024-03-14"),
  seedItem(14, "XYXX", "DuraPro", "Bonding Agent", "5ml", 16, "2025-10-05", "2024-03-19"),
];
