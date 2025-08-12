const { useState } = React;

const AuthForm = ({ onLogin, onRegister, registrationsEnabled }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            if (isRegister) {
                await onRegister(email, password);
            } else {
                await onLogin(email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="theme-dnd-card p-8 w-full max-w-md">
                <h1 className="text-4xl text-center mb-2 font-title">{isRegister ? "Forge Your Account" : "Welcome, Adventurer"}</h1>
                <p className="text-center text-parchment mb-6"> {isRegister ? "Your legend is about to begin." : "Your quest awaits."}</p>

                {error && <p className="bg-red-900/50 border border-red-700 text-white p-3 rounded mb-4 text-center">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block mb-2 font-title text-lg accent-gold">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="your-name@tavern.com"
                            required
                            className="w-full theme-dnd-input"
                        />
                    </div>
                    <div>
                        <label className="block mb-2 font-title text-lg accent-gold">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="secret-scroll"
                            required
                            className="w-full theme-dnd-input"
                        />
                    </div>
                    <button type="submit" className="w-full theme-dnd-button text-xl py-3">
                        {isRegister ? "Register" : "Enter the Realm"}
                    </button>
                </form>

                {registrationsEnabled && (
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(""); }}
                        className="w-full mt-6 text-center text-sm text-parchment hover:text-accent-gold transition"
                    >
                        {isRegister ? "Already have a character? Login" : "New to these lands? Register"}
                    </button>
                )}
            </div>
        </div>
    );
};
