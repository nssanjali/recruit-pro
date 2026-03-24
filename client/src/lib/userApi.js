const _rawApiUrl = import.meta.env.VITE_API_URL || '';
const _isLocalhost = _rawApiUrl.includes('localhost') || _rawApiUrl.includes('127.0.0.1');
const API_URL = (_rawApiUrl && !_isLocalhost) ? _rawApiUrl : '/api';

// User API
export const getUsers = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getUsersByRole = async (role) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/role/${role}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch users by role');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getUserStats = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch user stats');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const updateUserRole = async (id, role) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/${id}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role })
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || 'Failed to update user role');
        }
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const removeUser = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || 'Failed to delete user');
        }
        return true;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};
