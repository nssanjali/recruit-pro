import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute component to handle authentication and role-based access control.
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * @param {Object} props.user - Current user object
 */
const ProtectedRoute = ({ allowedRoles, user }) => {
    const token = localStorage.getItem('token');

    // If we're still loading user in App.jsx, user might be null initially.
    // But since App.jsx shows a loading spinner, we should have the user or null here.

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // If user is null but token exists, it might be an invalid token or still fetching.
    // App.jsx handles the loading state so if we are here, we either have a user or the token is bad.
    if (!user) {
        // Double check local storage as a quick fallback if App.jsx didn't finish or failed but token remains
        const userString = localStorage.getItem('user');
        if (!userString) return <Navigate to="/login" replace />;

        try {
            const fallbackUser = JSON.parse(userString);
            if (allowedRoles && !allowedRoles.includes(fallbackUser.role)) {
                return <Navigate to={`/${fallbackUser.role}`} replace />;
            }
            return <Outlet />;
        } catch (e) {
            return <Navigate to="/login" replace />;
        }
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
