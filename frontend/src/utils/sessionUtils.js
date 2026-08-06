/**
 * Helper to compute session label from stored 2-digit end year integer.
 * e.g. 23 => "22 - 23"
 * Formula: (val - 1) - (val)
 */
export const formatSessionLabel = (sessionValue) => {
    if (sessionValue === null || sessionValue === undefined || sessionValue === '') {
        return null;
    }
    const num = Number(sessionValue);
    if (isNaN(num)) return null;

    const startYear = num - 1;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(startYear)} - ${pad(num)}`;
};

/**
 * Generate session dropdown options dynamically based on current year.
 * Returns array of objects: { value: 23, label: "22 - 23" }
 */
export const generateSessionOptions = (rangePast = 10, rangeFuture = 3) => {
    const currentYearFull = new Date().getFullYear();
    const currentYear2Digit = currentYearFull % 100;

    const options = [];
    const minEndYear = currentYear2Digit - rangePast;
    const maxEndYear = currentYear2Digit + rangeFuture;

    for (let endYear = maxEndYear; endYear >= minEndYear; endYear--) {
        const val = (endYear + 100) % 100;
        const label = formatSessionLabel(val);
        options.push({ value: val, label });
    }

    return options;
};
