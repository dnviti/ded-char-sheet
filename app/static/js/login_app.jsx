function LoginApp() {
    // The AuthForm component is self-contained and handles its own state,
    // including the UI layout and error messages. We just need to provide
    // the handler functions for what to do on a successful login or register.

    const onLogin = async (email, password) => {
        // The `handleLogin` function is global (from api/auth/login.js).
        // It throws an error on failure, which will be caught by AuthForm's internal state.
        // We only need to define the success case: redirecting to the main app.
        await handleLogin(email, password, () => {});
        window.location.href = '/';
    };

    const onRegister = async (email, password) => {
        // Same logic for registration.
        await handleRegister(email, password, () => {});
        window.location.href = '/';
    };

    // Render the AuthForm directly. It will create the entire page layout.
    return (
        <AuthForm
            onLogin={onLogin}
            onRegister={onRegister}
            registrationsEnabled={window.REGISTRATIONS_ENABLED}
        />
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<LoginApp />);
