const { useState, useEffect, useCallback } = React;

const UserEditModal = ({ user, onClose, onSave, quotas }) => {
    const [formData, setFormData] = useState({
        email: user?.email || "",
        password: "",
        package: user?.package || "free",
        is_active: user?.is_active !== undefined ? user.is_active : true,
        is_superuser: user?.is_superuser || false,
    });
    const [error, setError] = useState("");

    const isCreating = !user?.id;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await onSave(formData, user?.id);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="theme-dnd-card p-8 rounded-lg shadow-xl w-full max-w-md m-4">
                <h2 className="text-3xl font-title mb-6 text-center">{isCreating ? "Create New User" : "Edit User"}</h2>
                {error && <p className="bg-red-900/50 border border-red-700 text-white p-3 rounded mb-4 text-center">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-title text-lg accent-gold">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full theme-dnd-input" />
                    </div>
                    <div>
                        <label className="block mb-1 font-title text-lg accent-gold">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder={isCreating ? "Required" : "Leave blank to keep current"} className="w-full theme-dnd-input" />
                    </div>
                    <div>
                        <label className="block mb-1 font-title text-lg accent-gold">Package</label>
                        <select name="package" value={formData.package} onChange={handleChange} className="w-full theme-dnd-input">
                            {Object.keys(quotas).map(pkg => <option key={pkg} value={pkg}>{pkg}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="font-title text-lg accent-gold flex items-center">
                            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="mr-2 h-5 w-5 theme-dnd-checkbox" />
                            Active
                        </label>
                        <label className="font-title text-lg accent-gold flex items-center">
                            <input type="checkbox" name="is_superuser" checked={formData.is_superuser} onChange={handleChange} className="mr-2 h-5 w-5 theme-dnd-checkbox" />
                            Admin
                        </label>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="theme-dnd-button-secondary">Cancel</button>
                        <button type="submit" className="theme-dnd-button">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingUser, setEditingUser] = useState(null); // null: closed, {}: new user, {user}: edit user

    const QUOTAS = { "free": 10, "premium": 100 };

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error("Failed to fetch users. Are you an admin?");
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSaveUser = async (formData, userId) => {
        const isCreating = !userId;
        const url = isCreating ? '/api/admin/users' : `/api/admin/users/${userId}`;
        const method = isCreating ? 'POST' : 'PATCH';

        let body = { ...formData };
        if (method === 'PATCH' && !body.password) {
            delete body.password; // Don't send empty password on update
        }

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to ${isCreating ? 'create' : 'update'} user.`);
        }

        await fetchUsers(); // Refresh list
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to delete user.");
            }
            setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <p className="text-parchment text-center">Loading users...</p>;
    if (error) return <p className="text-red-400 text-center p-4 bg-red-900/50 rounded-md">Error: {error}</p>;

    return (
        <div className="theme-dnd-card p-4 sm:p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-title">Admin Dashboard</h2>
                <button onClick={() => setEditingUser({})} className="theme-dnd-button">
                    Create User
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-parchment">
                    <thead className="border-b-2 border-stone-500">
                        <tr>
                            <th className="p-3 font-title">Email</th>
                            <th className="p-3 font-title">Package</th>
                            <th className="p-3 font-title hidden sm:table-cell">Generations</th>
                            <th className="p-3 font-title">Status</th>
                            <th className="p-3 font-title">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-stone-700 hover:bg-stone-800/50">
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{user.package}</td>
                                <td className="p-3 hidden sm:table-cell">{user.generation_count}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${user.is_active ? 'bg-green-800/70 text-green-200' : 'bg-red-800/70 text-red-200'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    {user.is_superuser && (
                                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-800/70 text-purple-200">
                                            Admin
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                    <button onClick={() => setEditingUser(user)} className="theme-dnd-button-sm mr-2">Edit</button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs transition-colors">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSaveUser}
                    quotas={QUOTAS}
                />
            )}
        </div>
    );
};
