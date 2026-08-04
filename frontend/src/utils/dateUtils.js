/**
 * Utility functions for consistent date & time handling across timezone boundaries.
 */

/**
 * Formats a Date object or ISO string into a local YYYY-MM-DDTHH:mm string for <input type="datetime-local">
 */
export const formatForDatetimeLocal = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
};

/**
 * Formats a Date object or ISO string into a local YYYY-MM-DD string for <input type="date">
 */
export const formatForDateInput = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${year}-${month}-${day}`;
};

/**
 * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) into a UTC ISO-8601 string.
 */
export const datetimeLocalToISO = (datetimeLocalStr) => {
    if (!datetimeLocalStr) return null;
    const d = new Date(datetimeLocalStr);
    return isNaN(d.getTime()) ? datetimeLocalStr : d.toISOString();
};

/**
 * Converts a YYYY-MM-DD date input string representing 12:00 AM local time into a UTC ISO-8601 string.
 */
export const dateInputToStartOfDayISO = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    return isNaN(d.getTime()) ? `${dateStr}T00:00:00` : d.toISOString();
};

/**
 * Converts a YYYY-MM-DD date input string representing 11:59:59 PM local time into a UTC ISO-8601 string.
 */
export const dateInputToEndOfDayISO = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T23:59:59`);
    return isNaN(d.getTime()) ? `${dateStr}T23:59:59` : d.toISOString();
};

/**
 * Formats a date string for display in the local locale.
 */
export const formatDisplayDateTime = (isoStr, options = {}) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
};

/**
 * Formats a date string for date-only display in local locale.
 */
export const formatDisplayDate = (isoStr, options = {}) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    });
};
