// In production, never use a localhost URL even if VITE_API_URL was accidentally set to one.
const _rawApiUrl = import.meta.env.VITE_API_URL || '';
const _isLocalhost = _rawApiUrl.includes('localhost') || _rawApiUrl.includes('127.0.0.1');
const API_URL = (_rawApiUrl && !_isLocalhost) ? _rawApiUrl : '/api';

const apiFetch = async (url, options = {}) => {
    try {
        return await fetch(url, options);
    } catch (error) {
        console.error('[API Network Error]', {
            url,
            method: options.method || 'GET',
            apiBase: API_URL,
            message: error?.message || 'Unknown network error',
            hint: 'Verify backend server is running and VITE_API_URL is correct'
        });
        throw error;
    }
};

// Interview API
export const scheduleInterview = async (interviewData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/interviews/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
        const response = await apiFetch(`${API_URL}/interviews`);

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
        const response = await apiFetch(`${API_URL}/assignments`);

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
        const response = await apiFetch(`${API_URL}/assignments`, {
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
        const response = await apiFetch(`${API_URL}/assignments/${assignmentId}/assign`, {
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
        const response = await apiFetch(`${API_URL}/queue`);

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
        const response = await apiFetch(`${API_URL}/queue`, {
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
        const response = await apiFetch(`${API_URL}/queue/${queueId}`, {
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

        const response = await apiFetch(`${API_URL}/jobs`, {
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

export const analyzeCandidateRoleFit = async (payload = {}) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/role-fit/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.message || 'Failed to analyze role fit');
        }
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getJob = async (id) => {
    try {
        const response = await apiFetch(`${API_URL}/jobs/${id}`);
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
        const response = await apiFetch(`${API_URL}/jobs`, {
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

export const getJobById = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch job');
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const updateJob = async (id, jobData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(jobData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update job');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const deleteJob = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete job');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const retryFailedSchedules = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/retry-scheduling`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.message || 'Failed to retry scheduling');
        }
        return result.data || result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getMappedRecruiters = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/${jobId}/mapped-recruiters`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch mapped recruiters');
        }
        return result.data || [];
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getJobInterviews = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/interviews/job/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || 'Failed to fetch job interviews');
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getAdminCalendarData = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/calendar/data/admin`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || 'Failed to fetch admin calendar data');
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
        const response = await apiFetch(`${API_URL}/jobs/${id}/candidates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch candidates');
        const result = await response.json();
        // Return object with candidates array and includeMatchAnalysis flag
        return {
            candidates: result.data,
            includeMatchAnalysis: result.includeMatchAnalysis
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const applyJob = async (jobId, applicationData = {}) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/${jobId}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(applicationData)
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
        const response = await apiFetch(`${API_URL}/applications`, {
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

export const getApplicationById = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/applications/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch application');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const updateApplicationStatus = async (id, data) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/applications/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to update application');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// [DEV] Force Gemini re-analysis — clears cache and re-runs evaluation
export const reanalyzeApplication = async (id) => {
    const token = localStorage.getItem('token');
    const response = await apiFetch(`${API_URL}/applications/${id}/reanalyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Re-analysis failed');
    }
    return await response.json();
};

export const submitInterviewReview = async (interviewId, payload) => {
    const token = localStorage.getItem('token');
    const response = await apiFetch(`${API_URL}/interviews/${interviewId}/review-feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.message || 'Failed to submit interview review');
    }
    return result;
};

export const markInterviewAttendance = async (interviewId, payload) => {
    const token = localStorage.getItem('token');
    const response = await apiFetch(`${API_URL}/interviews/${interviewId}/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.message || 'Failed to mark interview attendance');
    }
    return result;
};


export const checkJobMatch = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/jobs/${jobId}/check-match`, {
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

        const response = await apiFetch(`${API_URL}/auth/me`, {
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

export const getMySecureResumeUrl = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/auth/me/resume-url`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.message || 'Failed to get secure resume URL');
        }
        return result.url;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const updateUserDetails = async (userData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/auth/updatedetails`, {
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

// Fetch a short-lived signed URL for a resume — requires auth token
// The server validates that the requester is allowed to view this resume
export const getSecureResumeUrl = async (applicationId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/applications/${applicationId}/resume-url`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to get secure resume URL');
        }

        const result = await response.json();
        return result.url;
    } catch (error) {
        console.error('API Error (getSecureResumeUrl):', error);
        throw error;
    }
};

// Get proxy URL for secure resume viewing (bypasses CORS issues)
export const getProxyResumeUrl = (applicationId) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/proxy/resume/${applicationId}?token=${token}`;
};

// Get proxy URL for user's own resume
export const getMyProxyResumeUrl = () => {
    const token = localStorage.getItem('token');
    return `${API_URL}/proxy/my-resume?token=${token}`;
};

export const uploadFile = async (file, type = 'file') => {
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append(type, file);

        const response = await apiFetch(`${API_URL}/upload/${type === 'file' ? '' : type}`, {
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
        
        // For resumes (private storage), return publicId instead of URL
        if (type === 'resume' && result.data.publicId) {
            return result.data.publicId;
        }
        
        // For other files (public storage), return URL
        return result.data.url;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};


