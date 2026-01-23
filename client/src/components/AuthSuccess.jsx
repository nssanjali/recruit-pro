import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../lib/api';

export function AuthSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        // Get token from URL params
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            // Store token
            localStorage.setItem('token', token);

            // Fetch user data using the verified API utility
            getCurrentUser().then(user => {
                if (user && user.role) {
                    localStorage.setItem('user', JSON.stringify(user));
                    // Redirect based on role
                    navigate(`/${user.role}`);
                } else {
                    console.error('User data incomplete or null');
                    navigate('/login');
                }
            }).catch(err => {
                console.error('Error fetching user:', err);
                navigate('/login');
            });
        } else {
            navigate('/login');
        }
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4285f4] mx-auto mb-4"></div>
                <p className="text-muted-foreground">Completing authentication...</p>
            </div>
        </div>
    );
}
