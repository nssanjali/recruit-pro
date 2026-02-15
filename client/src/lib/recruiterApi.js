const API_URL = 'http://localhost:5000/api';

// Get all recruiters (Company Admin)
export const getRecruiters = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch recruiters');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Get single recruiter
export const getRecruiter = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch recruiter');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Create recruiter (Company Admin)
export const createRecruiter = async (recruiterData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(recruiterData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create recruiter');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Update recruiter (Company Admin)
export const updateRecruiter = async (id, recruiterData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(recruiterData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update recruiter');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Delete recruiter (Company Admin)
export const deleteRecruiter = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete recruiter');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Get recruiter's own profile
export const getMyRecruiterProfile = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch profile');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Update recruiter's own profile
export const updateMyRecruiterProfile = async (profileData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/recruiters/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};
