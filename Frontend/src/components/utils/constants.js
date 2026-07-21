export const CATEGORIES = ['XYXX', 'CONSUMABLES', 'EQUIPMENT'];

export const FAILED_REASONS = ['Expired', 'Damaged', 'Quality Failed', 'Returned'];

export const EXCHANGE_STATUSES = ['pending', 'completed', 'rejected'];

export const ISSUE_STATUSES = ['active', 'returned'];

export const DELETE_REASONS = ['Damaged', 'Expired', 'Other'];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', adminOnly: false },
  { label: 'Stock', path: '/stock', icon: 'Package', adminOnly: false },
  { label: 'Student Details', path: '/students', icon: 'GraduationCap', adminOnly: true },
  { label: 'Issued', path: '/issued', icon: 'FileText', adminOnly: false },
  { label: 'Failed Inventory', path: '/failed-inventory', icon: 'AlertTriangle', adminOnly: false },
  { label: 'Track Exchange', path: '/track-exchange', icon: 'RefreshCw', adminOnly: false },
  { label: 'Stock Insertion', path: '/stock-insertion', icon: 'PlusCircle', adminOnly: false },
  { label: 'Inventory Updation', path: '/inventory-updation', icon: 'Edit', adminOnly: false },
  { label: 'Stock Deletion', path: '/stock-deletion', icon: 'Trash2', adminOnly: false },
  { label: 'Low Stock', path: '/low-stock', icon: 'AlertTriangle', adminOnly: true },
  { label: 'Settings', path: '/settings', icon: 'Settings', adminOnly: false },
  { label: 'Staff Manager', path: '/staff-manager', icon: 'Users', adminOnly: true },
  { label: 'Audit Log', path: '/audit-log', icon: 'ScrollText', adminOnly: true },
];

export const NOTIFICATION_TYPES = {
  low_stock: { icon: 'AlertTriangle', color: 'warning' },
  expiring: { icon: 'Clock', color: 'error' },
  exchange: { icon: 'RefreshCw', color: 'secondary' },
  issued: { icon: 'FileText', color: 'primary' },
  success: { icon: 'CheckCircle', color: 'success' },
};

export const PAGE_TITLES = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/stock': 'Stock',
  '/students': 'Student Details',
  '/issued': 'Issued Items',
  '/failed-inventory': 'Failed Inventory',
  '/track-exchange': 'Track Exchange',
  '/stock-insertion': 'Stock Insertion',
  '/inventory-updation': 'Inventory Updation',
  '/stock-deletion': 'Stock Deletion',
  '/low-stock': 'Low Stock Management',
  '/settings': 'Settings',
  '/staff-manager': 'Staff Manager',
  '/notifications': 'Notifications',
  '/audit-log': 'Audit Log',
};
