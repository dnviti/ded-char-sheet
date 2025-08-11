const { useState, useEffect } = React;

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/admin/users');
                if (!response.ok) {
                    throw new Error("Failed to fetch users. Are you an admin?");
                }
                const data = await response.json();
                setUsers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handlePackageChange = async (userId, newPackage) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/package`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package: newPackage })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update package.");
            }
            const updatedUser = await response.json();
            setUsers(users.map(u => u.id === userId ? updatedUser : u));
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <p className="text-white text-center">Loading users...</p>;
    if (error) return <p className="text-red-500 text-center">Error: {error}</p>;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
            <h2 className="text-2xl font-serif mb-4 text-white">Admin Dashboard</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="p-3">Email</th>
                            <th className="p-3">Package</th>
                            <th className="p-3">Generations Used</th>
                            <th className="p-3">Set Package</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-600">
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{user.package}</td>
                                <td className="p-3">{user.generation_count}</td>
                                <td className="p-3">
                                    <select
                                        value={user.package}
                                        onChange={(e) => handlePackageChange(user.id, e.target.value)}
                                        className="bg-gray-900 text-white p-2 rounded"
                                    >
                                        <option value="free">free</option>
                                        <option value="premium">premium</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
