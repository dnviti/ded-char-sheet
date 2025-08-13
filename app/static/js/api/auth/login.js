async function handleLogin(email, password, setCurrentUser) {
    const response = await fetch('/auth/jwt/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password: password })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed");
    }
    const userResponse = await fetch('/users/me');
    const user = await userResponse.json();
    setCurrentUser(user);
};
