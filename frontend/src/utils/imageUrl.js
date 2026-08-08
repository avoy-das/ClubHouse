/**
 * Utility function to build proper full asset URLs for images and attachments.
 * Handles absolute URLs, relative storage paths, blob URLs, data URIs, and fallback scenarios.
 *
 * @param {string|null} pathOrUrl - File path, URL, or backend URL attribute
 * @returns {string|null} Full web-accessible URL
 */
export const getImageUrl = (pathOrUrl) => {
    if (!pathOrUrl) return null;
    if (typeof pathOrUrl !== 'string') return null;

    const trimmed = pathOrUrl.trim();
    if (!trimmed) return null;

    // Already a full HTTP/HTTPS URL, blob URL, or base64 data URI
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('data:')
    ) {
        return trimmed;
    }

    // Standardize path slashes
    const cleanPath = trimmed.replace(/^\/+/, '');

    // Remove redundant 'storage/' prefix if present at start of relative path
    const relativePath = cleanPath.startsWith('storage/')
        ? cleanPath.substring(8)
        : cleanPath;

    // Get backend URL from environment or default to http://localhost:8000
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');

    return `${backendUrl}/storage/${relativePath}`;
};

export default getImageUrl;
