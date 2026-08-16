/**
 * Utility function to build proper full asset URLs for images and attachments.
 * Handles absolute URLs, relative storage paths, blob URLs, data URIs, and fallback scenarios.
 *
 * @param {string|null} pathOrUrl - File path, URL, or backend URL attribute
 * @returns {string|null} Full web-accessible URL
 */
export const getImageUrl = (pathOrUrl) => {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;

    const trimmed = pathOrUrl.trim();
    if (!trimmed) return null;

    // Blob URL or Base64 data URI
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
        return trimmed;
    }

    const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');

    // Fix URLs generated when Laravel APP_URL is missing port 8000 (e.g. http://localhost/storage/...)
    if (trimmed.startsWith('http://localhost/') || trimmed.startsWith('http://localhost:80/')) {
        return trimmed.replace(/^http:\/\/localhost(:80)?\//, `${backendUrl}/`);
    }
    if (trimmed.startsWith('http://127.0.0.1/') || trimmed.startsWith('http://127.0.0.1:80/')) {
        return trimmed.replace(/^http:\/\/127\.0\.0\.1(:80)?\//, `${backendUrl}/`);
    }

    // Already a full HTTP/HTTPS URL with proper host/port
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    // Standardize relative path slashes
    const cleanPath = trimmed.replace(/^\/+/, '');

    // Remove redundant 'storage/' prefix if present at start of relative path
    const relativePath = cleanPath.startsWith('storage/')
        ? cleanPath.substring(8)
        : cleanPath;

    return `${backendUrl}/storage/${relativePath}`;
};

export default getImageUrl;
