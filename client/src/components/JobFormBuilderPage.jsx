import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { JobFormBuilderPlayground } from './JobFormBuilderPlayground';
import { getJobById, updateJob } from '../lib/api';
import { toast } from 'sonner';

export function JobFormBuilderPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(!!id);
    const [initialFields, setInitialFields] = useState(null);

    useEffect(() => {
        if (id) {
            loadJob();
        } else {
            // Load from sessionStorage for new jobs
            const savedConfig = sessionStorage.getItem('pendingFormConfig');
            if (savedConfig) {
                try {
                    setInitialFields(JSON.parse(savedConfig));
                } catch (err) {
                    console.error('Failed to parse saved config:', err);
                }
            }
        }
    }, [id]);

    const loadJob = async () => {
        try {
            const job = await getJobById(id);
            if (job && job.applicationFormConfig) {
                // Load the entire config including both mandatory and custom fields
                setInitialFields(job.applicationFormConfig);
            }
        } catch (err) {
            toast.error('Failed to load job');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (formConfig) => {
        try {
            if (id) {
                // Update existing job
                await updateJob(id, { applicationFormConfig: formConfig });
                toast.success('Application form saved successfully!');
                setTimeout(() => navigate(`/edit-job/${id}`), 1500);
            } else {
                // Store in sessionStorage for new jobs
                sessionStorage.setItem('pendingFormConfig', JSON.stringify(formConfig));
                toast.success('Form configured! Redirecting back...');
                setTimeout(() => navigate('/post-job'), 1500);
            }
        } catch (err) {
            toast.error('Failed to save form configuration');
            console.error('Save error:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Loading form builder...</p>
                </div>
            </div>
        );
    }

    return <JobFormBuilderPlayground initialFields={initialFields} onSave={handleSave} />;
}
