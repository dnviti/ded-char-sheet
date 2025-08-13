const { useState } = React;

function LoginApp() {
    const [error, setError] = useState(null);

    const onLogin = async (email, password) => {
        try {
            setError(null);
            // The global handleLogin function from api/auth/login.js needs a `setCurrentUser` callback.
            // We don't need to set state here, just redirect on success.
            // The http-only cookie will be set by the server.
            await handleLogin(email, password, () => {});
            window.location.href = '/'; // Redirect to main app
        } catch (err) {
            setError(err.message);
        }
    };

    const onRegister = async (email, password) => {
        try {
            setError(null);
            // The global handleRegister from api.js also needs setCurrentUser.
            await handleRegister(email, password, () => {});
            // On success, handleRegister calls handleLogin, so the user will be logged in.
            window.location.href = '/'; // Redirect to main app
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-wood-dark">
             <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-wood-light border-4 border-theme">
                <header className="text-center mb-6">
                    <h1 className="text-5xl font-title text-stone-800">Character Keep</h1>
                    <p className="text-xl text-stone-600">Log in to manage your heroes</p>
                </header>
                {error && (
                    <div className="bg-red-800 text-white p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}
                <AuthForm onLogin={onLogin} onRegister={onRegister} registrationsEnabled={window.REGISTRATIONS_ENABLED} />
             </div>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<LoginApp />);
