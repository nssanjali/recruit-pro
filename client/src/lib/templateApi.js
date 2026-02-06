const API_URL = 'http://localhost:5000/api';

// Template API
export const getTemplates = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch templates');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getTemplate = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch template');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getTemplateForJob = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/job/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch template for job');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getDefaultFields = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/defaults/fields`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch default fields');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const createTemplate = async (templateData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(templateData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create template');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const updateTemplate = async (id, templateData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(templateData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update template');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const deleteTemplate = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete template');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};
