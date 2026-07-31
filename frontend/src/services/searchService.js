import api from './api';

const searchService = {
    /**
     * Global search across clubs, events, recruitment notices, and (for admins) members.
     * @param {string} query - Keyword to search (min 2 chars)
     */
    search: (query) => api.get('/search', { params: { q: query } }),
};

export default searchService;
