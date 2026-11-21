/**
 * Date and time formatting utilities tailored for Indian Standard Time (IST - UTC+5:30)
 * and 12-hour AM/PM format across FluentEdge.
 */

export function parseDateSafe(dateString?: string): Date | null {
  if (!dateString) return null;
  const str = String(dateString).trim();
  // If in YYYY-MM-DD format (no time component), prevent timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date only in IST (e.g., "20 Nov 2026")
 */
export function formatISTDate(dateString?: string): string {
  const date = parseDateSafe(dateString);
  if (!date) return dateString ? String(dateString) : '';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time only in IST in 12-hour AM/PM (e.g., "11:30 AM")
 */
export function formatISTTime(dateString?: string): string {
  const date = parseDateSafe(dateString);
  if (!date) return '';
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format full date and time in IST in 12-hour AM/PM (e.g., "20 Nov 2026, 11:30 AM")
 */
export function formatISTDateTime(dateString?: string): string {
  const date = parseDateSafe(dateString);
  if (!date) return '';
  const datePart = date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

/**
 * Human-readable contextual time in IST with AM/PM (e.g., "Today, 11:30 AM", "Yesterday, 4:15 PM", "18 Nov, 9:20 PM")
 */
export function formatTimeAgo(dateString?: string): string {
  const date = parseDateSafe(dateString);
  if (!date) return '';

  const now = new Date();
  const timeStr = date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate day difference relative to IST
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }

  const datePart = date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });
  return `${datePart}, ${timeStr}`;
}
