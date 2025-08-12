const { useState, useEffect } = React;

function AdminPage() {
    return (
        <div className="min-h-screen">
            <header className="bg-wood-light border-b-4 border-theme p-4 flex justify-between items-center shadow-lg print:hidden">
                <h1 className="text-3xl font-title">Admin Dashboard</h1>
                <a href="/" className="theme-dnd-button">Back to App</a>
            </header>
            <main className="p-4 md:p-8">
                <AdminDashboard />
            </main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<AdminPage />);
