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

export function exportToCSV(data, filename, columns) {
  const header = columns.map((c) => c.label).join(',');
  const rows = data.map((item) =>
    columns
      .map((c) => {
        const val = typeof c.value === 'function' ? c.value(item) : item[c.key];
        const str = String(val ?? '');
        return str.includes(',') ? `"${str}"` : str;
      })
      .join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
