const rawApiUrl = import.meta.env.VITE_API_URL || '';
const isLocalApiUrl = rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1');

export const API_URL = (rawApiUrl && !isLocalApiUrl) ? rawApiUrl : '/api';
export const API_ORIGIN = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

export const buildApiUrl = (path = '') => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_URL}${normalizedPath}`;
};
