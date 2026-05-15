document.addEventListener('DOMContentLoaded', () => {
    const menuOpen = document.getElementById('menuOpen');
    const menuClose = document.getElementById('menuClose');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Initialize theme
    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
    }

    menuOpen.addEventListener('click', () => mobileDrawer.classList.add('open'));
    menuOpen.addEventListener('mouseenter', () => mobileDrawer.classList.add('open'));
    mobileDrawer.addEventListener('mouseleave', () => mobileDrawer.classList.remove('open'));
    menuClose.addEventListener('click', () => mobileDrawer.classList.remove('open'));

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    // Login Logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');

            try {
                const response = await fetch('/api/auth/login', { // Assuming this is your login endpoint
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                let data;
                let errorMessage = "An unexpected error occurred."; // Default generic message

                const contentType = response.headers.get("content-type") || "";
                
                // Check if the response is JSON, or if it's an empty response (which might still be ok)
                if (contentType.includes("application/json") || response.status === 204) { // 204 No Content
                    try {
                        data = response.status === 204 ? {} : await response.json(); // Handle empty JSON for 204
                    } catch (jsonError) {
                        console.error("Failed to parse JSON response:", jsonError);
                        const rawText = await response.text(); // Get raw text for debugging
                        console.error("Raw response text:", rawText);
                        errorMessage = `Server responded with invalid JSON. Status: ${response.status} ${response.statusText}. Raw: ${rawText.substring(0, 200)}...`;
                        data = { error: errorMessage };
                    }
                } else {
                    // If not JSON, read as text for debugging
                    const rawText = await response.text();
                    console.error(`Server responded with non-JSON content (Type: ${contentType}). Status: ${response.status} ${response.statusText}. Raw:`, rawText);
                    errorMessage = `Server responded with non-JSON content. Status: ${response.status} ${response.statusText}. Raw: ${rawText.substring(0, 200)}...`;
                    data = { error: errorMessage };
                }

                if (response.ok) {
                    messageDiv.style.color = 'var(--pure-green)';
                    messageDiv.innerText = "Login successful! Redirecting...";
                    localStorage.setItem('token', data.token);
                    setTimeout(() => {
                        window.location.href = '/users/dashboard.html';
                    }, 1500);
                } else {
                    messageDiv.style.color = 'var(--pure-red)';
                    messageDiv.innerText = data.error || `Error ${response.status}: ${response.statusText}`;
                }
            } catch (err) {
                messageDiv.style.color = 'var(--pure-red)';
                messageDiv.innerText = "Connection error. Is the server running?";
                console.error("Fetch error:", err);
            }
        });
    }
});