import { useState } from 'react';
import { FileText, Lock, Eye } from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';

/**
 * SecureResumeViewer - A component that provides secure, download-disabled resume viewing
 * 
 * Features:
 * - Uses server proxy to bypass CORS issues
 * - Opens in modal with download prevention
 * - Shows security indicators
 * - Handles loading states and errors
 */
export function SecureResumeViewer({ 
    onGetSecureUrl, 
    applicationId, // New prop for direct proxy access
    useMyResume = false, // New prop for user's own resume
    label = "Resume.pdf", 
    className = "",
    variant = "default",
    size = "default",
    disabled = false,
    showSecurityBadge = true
}) {
    const [loading, setLoading] = useState(false);

    // Debug logging
    console.log('🔒 SecureResumeViewer render:', { applicationId, useMyResume });

    const handleViewResume = async () => {
        if (!onGetSecureUrl && !applicationId && !useMyResume) return;
        if (disabled) return;

        try {
            setLoading(true);
            
            let finalUrl;
            
            if (applicationId) {
                // Use proxy URL directly (bypasses CORS)
                const { getProxyResumeUrl } = await import('../lib/api.js');
                finalUrl = getProxyResumeUrl(applicationId);
                console.log('🔒 Generated proxy URL for application:', applicationId, finalUrl);
            } else if (useMyResume) {
                // Use my resume proxy URL
                const { getMyProxyResumeUrl } = await import('../lib/api.js');
                finalUrl = getMyProxyResumeUrl();
                console.log('🔒 Generated my resume proxy URL:', finalUrl);
            } else if (onGetSecureUrl) {
                // Legacy: Use signed URL approach
                const response = await onGetSecureUrl();
                finalUrl = typeof response === 'string' ? response : response?.url;
                const expiresIn = response?.expiresIn || 300;
                console.log('🔒 Generated signed URL:', finalUrl);
                toast.info(`Secure link generated - expires in ${Math.floor(expiresIn / 60)} minutes`, { duration: 3000 });
            }
            
            if (!finalUrl) {
                throw new Error('Failed to generate secure resume URL');
            }

            console.log('🔒 Opening resume in new tab:', finalUrl);
            
            // Open directly in new tab - no modal, no iframe issues
            const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
            
            if (!newWindow) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }
            
            toast.success('Resume opened in new tab', { duration: 2000 });
            
        } catch (error) {
            console.error('Error opening secure resume:', error);
            toast.error(error.message || 'Failed to open resume securely');
        } finally {
            setLoading(false);
        }
    };

    if (variant === "card") {
        return (
            <button
                type="button"
                disabled={loading || disabled}
                onClick={handleViewResume}
                className={`w-full flex items-center justify-between p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-blue-900">{label}</p>
                        <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {loading ? 'Opening resume...' : 'Secure access — click to view in new tab'}
                        </p>
                    </div>
                </div>
                {loading ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Eye className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                )}
            </button>
        );
    }

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            disabled={loading || disabled}
            onClick={handleViewResume}
            className={className}
        >
            {loading ? (
                <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Opening...
                </>
            ) : (
                <>
                    <FileText className="w-4 h-4 mr-2" />
                    {showSecurityBadge && <Lock className="w-3 h-3 mr-1 text-current opacity-70" />}
                    View Resume
                </>
            )}
        </Button>
    );
}

/**
 * Hook for secure resume viewing with different access patterns
 */
export function useSecureResumeViewer() {
    const [loading, setLoading] = useState(false);

    const viewMyResume = async (getMySecureResumeUrl) => {
        setLoading(true);
        try {
            return await getMySecureResumeUrl();
        } finally {
            setLoading(false);
        }
    };

    const viewApplicationResume = async (applicationId, getSecureResumeUrl) => {
        setLoading(true);
        try {
            return await getSecureResumeUrl(applicationId);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        viewMyResume,
        viewApplicationResume
    };
}