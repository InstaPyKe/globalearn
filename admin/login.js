document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'admin-dashboard.html';
        } else {
            errorMsg.innerText = data.error || 'ACCESS_DENIED';
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorMsg.innerText = 'CONNECTION_FAILURE';
        errorMsg.style.display = 'block';
    }
});