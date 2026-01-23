import { useState } from 'react';
import { Login } from './Login';
import { Signup } from './Signup';
import { ForgotPassword } from './ForgotPassword';

export function AuthPage() {
    const [view, setView] = useState('login'); // 'login', 'signup', 'forgot'

    if (view === 'login') {
        return (
            <Login
                onSwitchToSignup={() => setView('signup')}
                onForgotPassword={() => setView('forgot')}
            />
        );
    }

    if (view === 'signup') {
        return <Signup onSwitchToLogin={() => setView('login')} />;
    }

    if (view === 'forgot') {
        return <ForgotPassword onBackToLogin={() => setView('login')} />;
    }

    return null;
}
