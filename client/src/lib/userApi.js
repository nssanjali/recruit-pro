const API_URL = 'http://localhost:5000/api';

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
