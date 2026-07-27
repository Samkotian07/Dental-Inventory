export const mockUsers = [
  { id: 1, email: 'admin@yendental.com', password: 'admin123', role: 'admin', name: 'Admin User' },
  { id: 2, email: 'staff@yendental.com', password: 'staff123', role: 'staff', name: 'Staff User' },
];

export const mockInventory = [
  { id: 1, refNo: 'INV-001', invoiceNumber: 'INV-2024-001', category: 'XYXX', companyName: 'Dental Supplies Co.', productName: 'Dental X-Ray Film', size: '10x12', lotNo: 'LOT-2024-001', quantity: 45, lowStockThreshold: 15, expiryDate: '2025-12-31', status: 'active', createdAt: '2024-01-15' },
  { id: 2, refNo: 'INV-002', invoiceNumber: 'INV-2024-002', category: 'CONSUMABLES', companyName: 'MedTech Inc.', productName: 'Surgical Gloves', size: 'M', lotNo: 'LOT-2024-002', quantity: 8, lowStockThreshold: 10, expiryDate: '2025-08-15', status: 'active', createdAt: '2024-02-10' },
  { id: 3, refNo: 'INV-003', invoiceNumber: 'INV-2024-003', category: 'EQUIPMENT', companyName: 'DuraPro', productName: 'Dental Drill', size: 'Standard', lotNo: 'LOT-2024-003', quantity: 12, lowStockThreshold: 5, expiryDate: '2027-06-01', status: 'active', createdAt: '2024-03-05' },
  { id: 4, refNo: 'INV-004', invoiceNumber: 'INV-2024-004', category: 'XYXX', companyName: 'Dental Supplies Co.', productName: 'Composite Resin', size: '4g', lotNo: 'LOT-2024-004', quantity: 30, lowStockThreshold: 10, expiryDate: '2025-11-20', status: 'active', createdAt: '2024-03-12' },
  { id: 5, refNo: 'INV-005', invoiceNumber: 'INV-2024-005', category: 'CONSUMABLES', companyName: 'OralCare Ltd.', productName: 'Dental Floss', size: '50m', lotNo: 'LOT-2024-005', quantity: 5, lowStockThreshold: 15, expiryDate: '2025-09-30', status: 'active', createdAt: '2024-04-01' },
  { id: 6, refNo: 'INV-006', invoiceNumber: 'INV-2024-006', category: 'EQUIPMENT', companyName: 'MedTech Inc.', productName: 'UV Sterilizer', size: 'Large', lotNo: 'LOT-2024-006', quantity: 3, lowStockThreshold: 2, expiryDate: '2028-01-15', status: 'active', createdAt: '2024-04-18' },
  { id: 7, refNo: 'INV-007', invoiceNumber: 'INV-2024-007', category: 'XYXX', companyName: 'DuraPro', productName: 'Orthodontic Brackets', size: 'Standard', lotNo: 'LOT-2024-007', quantity: 120, lowStockThreshold: 30, expiryDate: '2026-03-10', status: 'active', createdAt: '2024-05-02' },
  { id: 8, refNo: 'INV-008', invoiceNumber: 'INV-2024-008', category: 'CONSUMABLES', companyName: 'OralCare Ltd.', productName: 'Mouth Mirror', size: 'No.5', lotNo: 'LOT-2024-008', quantity: 60, lowStockThreshold: 20, expiryDate: '2027-08-22', status: 'active', createdAt: '2024-05-20' },
  { id: 9, refNo: 'INV-009', invoiceNumber: 'INV-2024-009', category: 'XYXX', companyName: 'Dental Supplies Co.', productName: 'Etching Gel', size: '3ml', lotNo: 'LOT-2024-009', quantity: 2, lowStockThreshold: 5, expiryDate: '2025-07-05', status: 'active', createdAt: '2024-06-01' },
  { id: 10, refNo: 'INV-010', invoiceNumber: 'INV-2024-010', category: 'EQUIPMENT', companyName: 'MedTech Inc.', productName: 'Suction Unit', size: 'Compact', lotNo: 'LOT-2024-010', quantity: 7, lowStockThreshold: 3, expiryDate: '2028-12-31', status: 'active', createdAt: '2024-06-15' },
  { id: 11, refNo: 'INV-011', invoiceNumber: 'INV-2024-011', category: 'CONSUMABLES', companyName: 'DuraPro', productName: 'Cotton Rolls', size: 'Pack', lotNo: 'LOT-2024-011', quantity: 200, lowStockThreshold: 50, expiryDate: '2026-02-14', status: 'active', createdAt: '2024-06-28' },
  { id: 12, refNo: 'INV-012', invoiceNumber: 'INV-2024-012', category: 'XYXX', companyName: 'OralCare Ltd.', productName: 'Bonding Agent', size: '5ml', lotNo: 'LOT-2024-012', quantity: 15, lowStockThreshold: 8, expiryDate: '2025-10-18', status: 'active', createdAt: '2024-07-03' },
  { id: 13, refNo: 'INV-013', invoiceNumber: 'INV-2024-013', category: 'EQUIPMENT', companyName: 'Dental Supplies Co.', productName: 'LED Curing Light', size: 'Standard', lotNo: 'LOT-2024-013', quantity: 4, lowStockThreshold: 2, expiryDate: '2029-05-30', status: 'active', createdAt: '2024-07-15' },
  { id: 14, refNo: 'INV-014', invoiceNumber: 'INV-2024-014', category: 'CONSUMABLES', companyName: 'MedTech Inc.', productName: 'Examination Gloves', size: 'L', lotNo: 'LOT-2024-014', quantity: 90, lowStockThreshold: 25, expiryDate: '2025-06-25', status: 'active', createdAt: '2024-08-01' },
  { id: 15, refNo: 'INV-015', invoiceNumber: 'INV-2024-015', category: 'XYXX', companyName: 'DuraPro', productName: 'Amalgam Alloy', size: '500g', lotNo: 'LOT-2024-015', quantity: 18, lowStockThreshold: 10, expiryDate: '2026-07-12', status: 'active', createdAt: '2024-08-20' },
];

export const mockStudents = [
  { id: 1, name: 'John Doe', campusId: 'CS123', course: 'Dental Surgery', semester: '5', createdAt: '2024-01-15' },
  { id: 2, name: 'Jane Smith', campusId: 'CS124', course: 'Orthodontics', semester: '3', createdAt: '2024-01-20' },
  { id: 3, name: 'Michael Brown', campusId: 'CS125', course: 'Dental Surgery', semester: '5', createdAt: '2024-02-05' },
  { id: 4, name: 'Emily Davis', campusId: 'CS126', course: 'Periodontics', semester: '7', createdAt: '2024-02-18' },
  { id: 5, name: 'Chris Wilson', campusId: 'CS127', course: 'Orthodontics', semester: '3', createdAt: '2024-03-01' },
  { id: 6, name: 'Sarah Miller', campusId: 'CS128', course: 'Endodontics', semester: '6', createdAt: '2024-03-15' },
  { id: 7, name: 'David Lee', campusId: 'CS129', course: 'Dental Surgery', semester: '5', createdAt: '2024-04-02' },
  { id: 8, name: 'Anna Taylor', campusId: 'CS130', course: 'Pediatric Dentistry', semester: '4', createdAt: '2024-04-22' },
];

export const mockIssued = [
  { id: 1, issueId: 'ISS-001', studentId: 1, inventoryId: 1, studentName: 'John Doe', refNo: 'INV-001', productName: 'Dental X-Ray Film', lotNo: 'LOT-2024-001', quantity: 2, issueDate: '2024-06-10', returnDate: null, status: 'active' },
  { id: 2, issueId: 'ISS-002', studentId: 2, inventoryId: 2, studentName: 'Jane Smith', refNo: 'INV-002', productName: 'Surgical Gloves', lotNo: 'LOT-2024-002', quantity: 1, issueDate: '2024-06-12', returnDate: null, status: 'active' },
  { id: 3, issueId: 'ISS-003', studentId: 3, inventoryId: 4, studentName: 'Michael Brown', refNo: 'INV-004', productName: 'Composite Resin', lotNo: 'LOT-2024-004', quantity: 3, issueDate: '2024-06-15', returnDate: '2024-06-20', status: 'returned' },
  { id: 4, issueId: 'ISS-004', studentId: 4, inventoryId: 7, studentName: 'Emily Davis', refNo: 'INV-007', productName: 'Orthodontic Brackets', lotNo: 'LOT-2024-007', quantity: 10, issueDate: '2024-06-18', returnDate: null, status: 'active' },
  { id: 5, issueId: 'ISS-005', studentId: 5, inventoryId: 8, studentName: 'Chris Wilson', refNo: 'INV-008', productName: 'Mouth Mirror', lotNo: 'LOT-2024-008', quantity: 5, issueDate: '2024-06-22', returnDate: '2024-07-01', status: 'returned' },
  { id: 6, issueId: 'ISS-006', studentId: 6, inventoryId: 11, studentName: 'Sarah Miller', refNo: 'INV-011', productName: 'Cotton Rolls', lotNo: 'LOT-2024-011', quantity: 20, issueDate: '2024-07-05', returnDate: null, status: 'active' },
];

export const mockExchanges = [
  { id: 1, exchangeId: 'EXC-001', studentId: 1, inventoryId: 2, studentName: 'John Doe', refNo: 'INV-002', creditNumber: 'CR-2024-001', reason: 'Defective product', exchangeDate: '2024-06-12', status: 'pending' },
  { id: 2, exchangeId: 'EXC-002', studentId: 2, inventoryId: 4, studentName: 'Jane Smith', refNo: 'INV-004', creditNumber: 'CR-2024-002', reason: 'Wrong size received', exchangeDate: '2024-06-18', status: 'completed' },
  { id: 3, exchangeId: 'EXC-003', studentId: 3, inventoryId: 7, studentName: 'Michael Brown', refNo: 'INV-007', creditNumber: 'CR-2024-003', reason: 'Expired product', exchangeDate: '2024-06-25', status: 'rejected' },
  { id: 4, exchangeId: 'EXC-004', studentId: 4, inventoryId: 8, studentName: 'Emily Davis', refNo: 'INV-008', creditNumber: 'CR-2024-004', reason: 'Damaged packaging', exchangeDate: '2024-07-02', status: 'pending' },
];

export const mockFailedInventory = [
  { id: 1, refNo: 'INV-003', category: 'EQUIPMENT', productName: 'Dental Drill', lotNo: 'LOT-2024-003', failedDate: '2024-05-10', reason: 'Damaged', quantity: 1, status: 'failed' },
  { id: 2, refNo: 'INV-005', category: 'CONSUMABLES', productName: 'Dental Floss', lotNo: 'LOT-2024-005', failedDate: '2024-05-15', reason: 'Expired', quantity: 2, status: 'disposed' },
  { id: 3, refNo: 'INV-009', category: 'XYXX', productName: 'Etching Gel', lotNo: 'LOT-2024-009', failedDate: '2024-06-01', reason: 'Quality Failed', quantity: 1, status: 'failed' },
  { id: 4, refNo: 'INV-012', category: 'XYXX', productName: 'Bonding Agent', lotNo: 'LOT-2024-012', failedDate: '2024-06-20', reason: 'Returned', quantity: 3, status: 'failed' },
];

export const mockNotifications = [
  { id: 1, type: 'low_stock', title: 'Low Stock Alert', message: 'Surgical Gloves (INV-002) is low on stock (8 remaining)', isRead: false, createdAt: '2024-06-14T10:30:00Z', link: '/stock' },
  { id: 2, type: 'expiring', title: 'Expiring Soon', message: 'Etching Gel (INV-009) expires in 20 days', isRead: false, createdAt: '2024-06-15T08:15:00Z', link: '/stock' },
  { id: 3, type: 'exchange', title: 'New Exchange Request', message: 'John Doe requested an exchange for INV-002', isRead: true, createdAt: '2024-06-12T14:20:00Z', link: '/track-exchange' },
  { id: 4, type: 'issued', title: 'Item Issued', message: 'Cotton Rolls issued to Sarah Miller', isRead: true, createdAt: '2024-07-05T09:00:00Z', link: '/issued' },
  { id: 5, type: 'low_stock', title: 'Low Stock Alert', message: 'Dental Floss (INV-005) is low on stock (5 remaining)', isRead: false, createdAt: '2024-07-10T11:45:00Z', link: '/stock' },
];

export const mockStaff = [
  { id: 1, name: 'Admin User', email: 'admin@yendental.com', role: 'admin', status: 'active', createdAt: '2024-01-01' },
  { id: 2, name: 'Staff User', email: 'staff@yendental.com', role: 'staff', status: 'active', createdAt: '2024-01-15' },
  { id: 3, name: 'Robert Chen', email: 'robert@yendental.com', role: 'staff', status: 'active', createdAt: '2024-03-10' },
  { id: 4, name: 'Lisa Anderson', email: 'lisa@yendental.com', role: 'staff', status: 'inactive', createdAt: '2024-04-05' },
];

export const mockAuditLog = [
  { id: 1, timestamp: '2024-07-14T09:30:00Z', user: 'Admin User', action: 'CREATE', details: 'Added new inventory item INV-015', ipAddress: '192.168.1.10' },
  { id: 2, timestamp: '2024-07-14T08:15:00Z', user: 'Staff User', action: 'UPDATE', details: 'Updated quantity for INV-001', ipAddress: '192.168.1.25' },
  { id: 3, timestamp: '2024-07-13T16:45:00Z', user: 'Admin User', action: 'DELETE', details: 'Deleted inventory item INV-003', ipAddress: '192.168.1.10' },
  { id: 4, timestamp: '2024-07-13T14:20:00Z', user: 'Robert Chen', action: 'ISSUE', details: 'Issued INV-011 to Sarah Miller', ipAddress: '192.168.1.42' },
  { id: 5, timestamp: '2024-07-12T11:05:00Z', user: 'Staff User', action: 'LOGIN', details: 'Logged into the system', ipAddress: '192.168.1.25' },
  { id: 6, timestamp: '2024-07-12T10:00:00Z', user: 'Admin User', action: 'CREATE', details: 'Added new staff member Lisa Anderson', ipAddress: '192.168.1.10' },
  { id: 7, timestamp: '2024-07-11T15:30:00Z', user: 'Robert Chen', action: 'EXCHANGE', details: 'Processed exchange EXC-002', ipAddress: '192.168.1.42' },
];
