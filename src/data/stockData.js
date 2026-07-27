export const categories = ["All Categories", "NP Implants", "RP Implants", "Universal Bases", "Healing Abutments", "Impression Copings", "Implant Replicas", "Snappy Abutments", "Esthetic Abutments", "Temporary Abutments", "Instruments & Tools", "Membrane"];

function seedItem(num, category, company, product, size, qty, expiry, created, refNo, invoiceNo, lotNo) {
  const padded = String(num).padStart(3, "0");
  return {
    refNo: refNo || `INV-${padded}`,
    invoiceNo: invoiceNo || `INV-2024-${padded}`,
    lotNo: lotNo || `LOT-2024-${padded}`,
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
  // ============ NP IMPLANTS (3.5mm) ============
  seedItem(1, "NP Implants", "Nobel Biocare", "CC NP 3.5 x 10mm", "3.5x10mm", 8, "2030-12-31", "2026-01-16", "36700", "INV-4510315832", "4510315832"),
  seedItem(2, "NP Implants", "Nobel Biocare", "CC NP 3.5 x 11.5mm", "3.5x11.5mm", 8, "2030-12-31", "2026-01-16", "36701", "INV-4510315832", "4510315832"),

  // ============ RP IMPLANTS (4.3mm & 5.0mm) ============
  seedItem(3, "RP Implants", "Nobel Biocare", "CC RP 4.3 x 8mm", "4.3x8mm", 8, "2030-12-31", "2026-01-16", "36704", "INV-4510315832", "4510315832"),
  seedItem(4, "RP Implants", "Nobel Biocare", "CC RP 4.3 x 10mm", "4.3x10mm", 20, "2030-12-31", "2026-01-16", "36705", "INV-4510315832", "4510315832"),
  seedItem(5, "RP Implants", "Nobel Biocare", "CC RP 4.3 x 11.5mm", "4.3x11.5mm", 10, "2030-12-31", "2026-01-16", "36707", "INV-4510315832", "4510315832"),
  seedItem(6, "RP Implants", "Nobel Biocare", "CC RP 4.3 x 13mm", "4.3x13mm", 5, "2030-12-31", "2026-01-16", "36708", "INV-4510315832", "4510315832"),
  seedItem(7, "RP Implants", "Nobel Biocare", "CC RP 5.0 x 8mm", "5.0x8mm", 5, "2030-12-31", "2026-01-16", "36710", "INV-4510315832", "4510315832"),
  seedItem(8, "RP Implants", "Nobel Biocare", "CC RP 5.0 x 10mm", "5.0x10mm", 8, "2030-12-31", "2026-01-16", "36711", "INV-4510315832", "4510315832"),
  seedItem(9, "RP Implants", "Nobel Biocare", "CC RP 5.0 x 11.5mm", "5.0x11.5mm", 5, "2030-12-31", "2026-01-16", "36712", "INV-4510315832", "4510315832"),

  // ============ UNIVERSAL BASES (Straight Abutments) ============
  seedItem(10, "Universal Bases", "Nobel Biocare", "Universal base CC NP 1.5mm", "NP 1.5mm", 15, "2030-12-31", "2026-01-16", "38213", "INV-4510315832", "4510315832"),
  seedItem(11, "Universal Bases", "Nobel Biocare", "Universal base CC NP 3mm", "NP 3mm", 10, "2030-12-31", "2026-01-16", "38216", "INV-4510315832", "4510315832"),
  seedItem(12, "Universal Bases", "Nobel Biocare", "Universal base CC RP 1.5mm", "RP 1.5mm", 35, "2030-12-31", "2026-01-16", "38214", "INV-4510315832", "4510315832"),
  seedItem(13, "Universal Bases", "Nobel Biocare", "Universal base CC RP 3mm", "RP 3mm", 20, "2030-12-31", "2026-01-16", "38217", "INV-4510315832", "4510315832"),

  // ============ HEALING ABUTMENTS (Gingival Formers) ============
  seedItem(14, "Healing Abutments", "Nobel Biocare", "Healing abutment CC NP Ø 5 x 3mm", "NP 5x3mm", 3, "2030-12-31", "2026-01-16", "36641", "INV-4510315832", "4510315832"),
  seedItem(15, "Healing Abutments", "Nobel Biocare", "Healing abutment CC NP Ø 5 x 5mm", "NP 5x5mm", 2, "2030-12-31", "2026-01-16", "36642", "INV-4510315832", "4510315832"),
  seedItem(16, "Healing Abutments", "Nobel Biocare", "Healing abutment CC RP Ø 5 x 5mm", "RP 5x5mm", 7, "2030-12-31", "2026-01-16", "36646", "INV-4510315832", "4510315832"),
  seedItem(17, "Healing Abutments", "Nobel Biocare", "Healing abutment CC RP Ø 6 x 3mm", "RP 6x3mm", 6, "2030-12-31", "2026-01-16", "36647", "INV-4510315832", "4510315832"),
  seedItem(18, "Healing Abutments", "Nobel Biocare", "Healing abutment CC RP Ø 6 x 5mm", "RP 6x5mm", 4, "2030-12-31", "2026-01-16", "36648", "INV-4510315832", "4510315832"),
  seedItem(19, "Healing Abutments", "Nobel Biocare", "Healing abutment CC RP Ø 3.6 x 7mm", "RP 3.6x7mm", 3, "2030-12-31", "2026-01-16", "36872", "INV-4510315823", "4510315823"),

  // ============ IMPRESSION COPINGS ============
  seedItem(20, "Impression Copings", "Nobel Biocare", "Impression cop closed tray CC RP Ø 3.6 x 13mm", "RP 3.6x13mm", 2, "2030-12-31", "2026-01-16", "36540", "INV-4510315832", "4510315832"),
  seedItem(21, "Impression Copings", "Nobel Biocare", "Impression cop closed tray CC RP Ø 3.6 x 9mm", "RP 3.6x9mm", 2, "2030-12-31", "2026-01-16", "36541", "INV-4510315832", "4510315832"),
  seedItem(22, "Impression Copings", "Nobel Biocare", "Impression cop closed tray CC RP Ø 5 x 13mm", "RP 5x13mm", 3, "2030-12-31", "2026-01-16", "36542", "INV-4510315832", "4510315832"),
  seedItem(23, "Impression Copings", "Nobel Biocare", "Impression cop open tray CC RP Bridge", "RP Bridge", 2, "2030-12-31", "2026-01-16", "36931", "INV-4510315832", "4510315832"),
  seedItem(24, "Impression Copings", "Nobel Biocare", "Impression cop open tray CC NP Bridge", "NP Bridge", 3, "2030-12-31", "2026-01-16", "36930", "INV-4510315823", "4510315823"),

  // ============ IMPLANT REPLICAS (Lab Analogues) ============
  seedItem(25, "Implant Replicas", "Nobel Biocare", "Implant Replica CC NP", "NP", 5, "2030-12-31", "2026-01-16", "36697", "INV-4510315832", "4510315832"),
  seedItem(26, "Implant Replicas", "Nobel Biocare", "Implant Replica CC RP", "RP", 20, "2030-12-31", "2026-01-16", "36698", "INV-4510315832", "4510315832"),

  // ============ SNAPPY ABUTMENTS (Cement-Retained) ============
  seedItem(27, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 4.0 CC RP Wide 1.5mm", "4.0 RP Wide 1.5mm", 3, "2030-12-31", "2026-01-16", "36691", "INV-4510315832", "4510315832"),
  seedItem(28, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 4.0 CC RP Wide 3mm", "4.0 RP Wide 3mm", 3, "2030-12-31", "2026-01-16", "36692", "INV-4510315832", "4510315832"),
  seedItem(29, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 4.0 CC RP 1.5mm", "4.0 RP 1.5mm", 3, "2030-12-31", "2026-01-16", "36693", "INV-4510315832", "4510315832"),
  seedItem(30, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 4.0 CC RP 3mm", "4.0 RP 3mm", 3, "2030-12-31", "2026-01-16", "36694", "INV-4510315832", "4510315832"),
  seedItem(31, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 4.0 CC NP 1.5mm", "4.0 NP 1.5mm", 3, "2030-12-31", "2026-01-16", "36695", "INV-4510315832", "4510315832"),
  seedItem(32, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 4.0 CC NP 3mm", "4.0 NP 3mm", 2, "2030-12-31", "2026-01-16", "36696", "INV-4510315832", "4510315832"),
  seedItem(33, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 5.5 CC RP 1.5mm", "5.5 RP 1.5mm", 3, "2030-12-31", "2026-01-16", "36682", "INV-4510315832", "4510315832"),
  seedItem(34, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 5.5 CC RP 3mm", "5.5 RP 3mm", 3, "2030-12-31", "2026-01-16", "36683", "INV-4510315832", "4510315832"),
  seedItem(35, "Snappy Abutments", "Nobel Biocare", "Snappy Abutment 5.5 CC NP 1.5mm", "5.5 NP 1.5mm", 3, "2030-12-31", "2026-01-16", "36684", "INV-4510315832", "4510315832"),

  // ============ ESTHETIC ABUTMENTS (Angled 15°) ============
  seedItem(36, "Esthetic Abutments", "Nobel Biocare", "15° Esthetic Abutment CC RP 1.5mm", "RP 1.5mm", 3, "2030-12-31", "2026-01-16", "36672", "INV-4510315832", "4510315832"),
  seedItem(37, "Esthetic Abutments", "Nobel Biocare", "15° Esthetic Abutment CC RP 3mm", "RP 3mm", 6, "2030-12-31", "2026-01-16", "36673", "INV-4510315832", "4510315832"),
  seedItem(38, "Esthetic Abutments", "Nobel Biocare", "15° Esthetic Abutment CC NP 1.5mm", "NP 1.5mm", 5, "2030-12-31", "2026-01-16", "36667", "INV-4510315832", "4510315832"),
  seedItem(39, "Esthetic Abutments", "Nobel Biocare", "15° Esthetic Abutment CC NP 3mm", "NP 3mm", 5, "2030-12-31", "2026-01-16", "36668", "INV-4510315832", "4510315832"),

  // ============ TEMPORARY ABUTMENTS ============
  seedItem(40, "Temporary Abutments", "Nobel Biocare", "Temporary Abutment Engaging CC NP", "NP", 3, "2030-12-31", "2026-01-16", "36663", "INV-4510315832", "4510315832"),
  seedItem(41, "Temporary Abutments", "Nobel Biocare", "Temporary Abutment Engaging CC RP", "RP", 3, "2030-12-31", "2026-01-16", "36664", "INV-4510315832", "4510315832"),

  // ============ INSTRUMENTS & TOOLS ============
  seedItem(42, "Instruments & Tools", "Nobel Biocare", "Man Torque Wrench Surgical", "Surgical", 1, "2030-12-31", "2026-01-16", "28839", "INV-4510315832", "4510315832"),
  seedItem(43, "Instruments & Tools", "Nobel Biocare", "Manual Torque Wrench Adapter Prosthetic", "Prosthetic", 4, "2030-12-31", "2026-01-16", "29167", "INV-4510315832", "4510315832"),
  seedItem(44, "Instruments & Tools", "Nobel Biocare", "Precision Drill", "Standard", 9, "2030-12-31", "2026-01-16", "36118", "INV-4510315832", "4510315832"),
  seedItem(45, "Instruments & Tools", "Nobel Biocare", "Screwdriver Manual UniGrip 28mm", "28mm", 1, "2030-12-31", "2026-01-16", "29149", "INV-4510315832", "4510315832"),
  seedItem(46, "Instruments & Tools", "Nobel Biocare", "Screwdriver Manual UniGrip 20mm", "20mm", 1, "2030-12-31", "2026-01-16", "29148", "INV-4510315823", "4510315823"),

  // ============ MEMBRANE ============
  seedItem(47, "Membrane", "Nobel Biocare", "creos xenoprotect 15 x 20 mm", "15x20mm", 6, "2030-12-31", "2026-01-16", "E1520", "INV-4510315823", "4510315823"),
];