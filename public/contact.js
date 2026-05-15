document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    if (localStorage.getItem('theme') === 'light') body.classList.add('light-mode');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            const respDiv = document.getElementById('responseMessage');
            respDiv.innerText = "Sending...";

            try {
                const res = await fetch('/api/contact/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await res.json();
                if (res.ok) {
                    respDiv.style.color = 'var(--pure-green)';
                    respDiv.innerText = data.message;
                    contactForm.reset();
                } else {
                    respDiv.style.color = 'var(--pure-red)';
                    respDiv.innerText = data.error;
                }
            } catch (err) {
                respDiv.style.color = 'var(--pure-red)';
                respDiv.innerText = "Connection error. Please try again.";
            }
        });
    }
});