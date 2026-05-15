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

    if (menuOpen) {
        menuOpen.addEventListener('click', () => mobileDrawer.classList.add('open'));
        menuOpen.addEventListener('mouseenter', () => mobileDrawer.classList.add('open'));
    }
    // Only add mouseleave if it's not a touch device to prevent accidental closing
    if (mobileDrawer && !('ontouchstart' in window || navigator.maxTouchPoints)) {
        mobileDrawer.addEventListener('mouseleave', () => mobileDrawer.classList.remove('open'));
    }
    if (menuClose) {
        menuClose.addEventListener('click', () => mobileDrawer.classList.remove('open'));
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }

    // Referral and Registration Logic
    async function checkReferrer() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            try {
                const response = await fetch(`/api/auth/referrer/${refCode}`);
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('referrer-name').innerText = data.username;
                    document.getElementById('invite-section').style.display = 'block';
                }
            } catch (err) {
                console.error("Error fetching referrer info:", err);
            }
        }
    }

    checkReferrer();

    // Phone validation logic with Provider Detection
    const phoneInput = document.getElementById('phone');
    const phoneFeedback = document.getElementById('phone-feedback');

    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            const phoneNumber = phoneInput.value.trim();
            if (!phoneNumber) {
                phoneFeedback.innerText = "";
                return;
            }

            const cleanNumber = phoneNumber.replace(/\D/g, '');
            
            if (cleanNumber.length > 0 && !cleanNumber.startsWith('0')) {
                phoneFeedback.style.color = "var(--pure-red)";
                phoneFeedback.innerText = "⚠ START WITH 0 (e.g., 07...)";
                return;
            }

            if (cleanNumber.length < 4) {
                phoneFeedback.style.color = "#888";
                phoneFeedback.innerText = "VERIFYING PREFIX...";
                return;
            }

            const providers = [
                {
                    name: 'Safaricom',
                    color: 'var(--pure-green)',
                    regex: /^(070[0-9]|071[0-9]|072[0-9]|074[0-3,5,6,8]|075[7-9]|076[8,9]|079[0-9]|011[0-5])/
                },
                {
                    name: 'Airtel',
                    color: 'var(--pure-red)',
                    regex: /^(073[0-9]|075[0-6]|078[0-9]|010[0-2])/
                },
                {
                    name: 'Telkom',
                    color: '#00FFFF',
                    regex: /^(077[0-9])/
                }
            ];

            const match = providers.find(p => p.regex.test(cleanNumber));
            if (match) {
                phoneFeedback.style.color = match.color;
                phoneFeedback.innerText = `✓ ${match.name} NETWORK DETECTED`;
            } else {
                phoneFeedback.style.color = "var(--pure-red)";
                phoneFeedback.innerText = "⚠ UNKNOWN PROVIDER";
            }
        });
    }

    function showNotification(text, type) {
        const messageDiv = document.getElementById('message');
        const card = document.querySelector('.reg-container');
        messageDiv.innerHTML = text; // Use innerHTML to allow for richer messages if needed
        messageDiv.className = type; 
        messageDiv.style.display = 'block';
        if (type === 'error') {
            card.classList.add('shake');
            setTimeout(() => card.classList.remove('shake'), 400);
        }
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const phone = document.getElementById('phone').value;
            const messageDiv = document.getElementById('message'); // Keep reference for clearing
            messageDiv.style.display = 'none';

            const urlParams = new URLSearchParams(window.location.search);
            const referrerCode = urlParams.get('ref');

            if (password !== confirmPassword) {
                showNotification("Confirmation mismatch. Passwords must be identical.", "error");
                return;
            }

            // Kenyan Phone Validation
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length !== 10 || !/^0[17]/.test(cleanPhone)) {
                showNotification("Invalid Kenyan phone number format (use 07... or 01...)", "error");
                return;
            }

            // Button loading state
            const submitBtn = document.getElementById('submitBtn');
            const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
            if (submitBtn) {
                submitBtn.classList.add('loading');
                if (btnText) btnText.innerText = "Initializing...";
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, phone, referrerCode })
                });

                let data;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = await response.json();
                } else {
                    data = { error: "An unexpected error occurred." };
                }

                if (response.ok) {
                    showNotification(data.message || "Protocol Accepted! Initializing vault access...", "success");
                    if (btnText) btnText.innerText = "Verified";
                    
                    // Disable form to prevent multiple submissions
                    registerForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
                    
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    if (submitBtn) submitBtn.classList.remove('loading');
                    if (btnText) btnText.innerText = "Initialize Protocol";
                    showNotification(data.error || "Access Denied: Registration Failed.", "error");
                }
            } catch (err) {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    if (btnText) btnText.innerText = "Initialize Protocol";
                }
                showNotification("Network breach. Server connection lost.", "error");
            }
        });
    }
});