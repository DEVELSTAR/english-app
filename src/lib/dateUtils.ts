/**
 * Date and time formatting utilities tailored for Indian Standard Time (IST - UTC+5:30)
 * and 12-hour AM/PM format across FluentEdge.
 */

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in Indian Standard Time (Asia/Kolkata).
 * Eliminates timezone conversion shifts where UTC midnight becomes yesterday in IST.
 */
export function getTodayISTDateString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Safely parse date and datetime strings with proper IST timezone handling.
 */
export function parseDateSafe(dateString?: string | Date): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return isNaN(dateString.getTime()) ? null : dateString;

  const str = String(dateString).trim();
  // YYYY-MM-DD format (date only)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T00:00:00+05:30`);
  }

  // MySQL DATETIME format YYYY-MM-DD HH:MM:SS or ISO string without timezone
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(str)) {
    const iso = str.replace(' ', 'T');
    if (!iso.includes('+') && !iso.endsWith('Z')) {
      return new Date(`${iso}+05:30`);
    }
    return new Date(iso);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date only in IST (e.g., "20 Nov 2026")
 */
export function formatISTDate(dateString?: string | Date): string {
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
export function formatISTTime(dateString?: string | Date): string {
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
export function formatISTDateTime(dateString?: string | Date): string {
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
 * Human-readable contextual time in IST:
 * - If under 10 seconds: "Just now"
 * - If under 60 seconds: "X sec ago"
 * - If under 60 minutes: "X min ago" / "X mins ago"
 * - If under 24 hours: "X hour ago" / "X hours ago"
 * - Once it crosses 24 hours: Shows date in IST (e.g., "20 Nov 2026")
 */
export function formatTimeAgo(dateString?: string | Date): string {
  const date = parseDateSafe(dateString);
  if (!date) return dateString ? String(dateString) : '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If in the future or under 10 seconds
  if (diffMs < 10000) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return `${diffSec} sec ago`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Once it crosses 24 hours, show date in IST
  return formatISTDate(date);
}

/**
 * Displays a lesson's creation or scheduled date:
 * - If within 24 hours: shows "sec/min/hours ago"
 * - Once it crosses 24 hours: shows formatted IST date
 */
export function formatLessonDisplayDate(lesson?: {
  lesson_date?: string;
  created_at?: string;
} | string): string {
  if (!lesson) return '';

  if (typeof lesson === 'string') {
    return formatTimeAgo(lesson);
  }

  // If created_at timestamp is available, use it for relative time
  if (lesson.created_at) {
    return formatTimeAgo(lesson.created_at);
  }

  // If only lesson_date (YYYY-MM-DD) is present
  if (lesson.lesson_date) {
    const today = getTodayISTDateString();
    if (lesson.lesson_date.startsWith(today)) {
      return 'Today';
    }
    return formatISTDate(lesson.lesson_date);
  }

  return '';
}
