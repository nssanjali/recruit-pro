const API_URL = 'http://localhost:5000/api';

// Interview API
export const scheduleInterview = async (interviewData) => {
    try {
        const response = await fetch(`${API_URL}/interviews/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(interviewData),
        });

        if (!response.ok) {
            throw new Error('Failed to schedule interview');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getInterviews = async () => {
    try {
        const response = await fetch(`${API_URL}/interviews`);

        if (!response.ok) {
            throw new Error('Failed to fetch interviews');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Recruiter Assignment API
export const getAssignments = async () => {
    try {
        const response = await fetch(`${API_URL}/assignments`);

        if (!response.ok) {
            throw new Error('Failed to fetch assignments');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const createAssignment = async (assignmentData) => {
    try {
        const response = await fetch(`${API_URL}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(assignmentData),
        });

        if (!response.ok) {
            throw new Error('Failed to create assignment');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const assignRecruiter = async (assignmentId) => {
    try {
        const response = await fetch(`${API_URL}/assignments/${assignmentId}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to assign recruiter');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Scheduling Queue API
export const getQueueItems = async () => {
    try {
        const response = await fetch(`${API_URL}/queue`);

        if (!response.ok) {
            throw new Error('Failed to fetch queue items');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const createQueueItem = async (queueData) => {
    try {
        const response = await fetch(`${API_URL}/queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(queueData),
        });

        if (!response.ok) {
            throw new Error('Failed to create queue item');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const deleteQueueItem = async (queueId) => {
    try {
        const response = await fetch(`${API_URL}/queue/${queueId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete queue item');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};
// Job API
export const getJobs = async () => {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`${API_URL}/jobs`, {
            headers
        });

        if (!response.ok) throw new Error('Failed to fetch jobs');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getJob = async (id) => {
    try {
        const response = await fetch(`${API_URL}/jobs/${id}`);
        if (!response.ok) throw new Error('Failed to fetch job');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const createJob = async (jobData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(jobData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create job');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getJobCandidates = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/jobs/${id}/candidates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch candidates');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};



export const applyJob = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to apply to job');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getApplications = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/applications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch applications');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const checkJobMatch = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/jobs/${jobId}/check-match`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to check match');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
};

export const updateUserDetails = async (userData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/updatedetails`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update details');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const uploadFile = async (file, type = 'file') => {
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append(type, file);

        const response = await fetch(`${API_URL}/upload/${type === 'file' ? '' : type}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload file');
        }

        const result = await response.json();
        return result.data.url;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};
