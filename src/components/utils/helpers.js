import { format, formatDistanceToNow, parseISO, isAfter, differenceInDays } from 'date-fns';

export function formatDate(dateStr, fmt = 'MMM dd, yyyy') {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function isExpiringSoon(dateStr, days = 90) {
  if (!dateStr) return false;
  try {
    const diff = differenceInDays(parseISO(dateStr), new Date());
    return diff >= 0 && diff <= days;
  } catch {
    return false;
  }
}

export function isExpired(dateStr) {
  if (!dateStr) return false;
  try {
    return !isAfter(parseISO(dateStr), new Date());
  } catch {
    return false;
  }
}

export function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function paginate(array, page, perPage = 8) {
  const start = (page - 1) * perPage;
  return array.slice(start, start + perPage);
}

export function totalPages(total, perPage = 8) {
  return Math.max(1, Math.ceil(total / perPage));
}

import * as XLSX from 'xlsx';

export function exportToExcel(data, filename, columns) {
  const formattedData = data.map((item) => {
    const obj = {};
    columns.forEach((c) => {
      const val = typeof c.value === 'function' ? c.value(item) : item[c.key];
      obj[c.label] = val ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  const cleanName = filename.replace(/\.(csv|xlsx)$/i, '');
  XLSX.writeFile(workbook, `${cleanName}.xlsx`);
}

export const exportToCSV = exportToExcel;

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
