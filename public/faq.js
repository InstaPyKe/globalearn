document.addEventListener('DOMContentLoaded', () => {
    console.log("FAQ Script Initialized");
    const menuOpen = document.getElementById('menuOpen');
    const menuClose = document.getElementById('menuClose');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Initialize theme
    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
    }

    if (menuOpen && mobileDrawer) {
        menuOpen.addEventListener('click', () => mobileDrawer.classList.add('open'));
        menuOpen.addEventListener('mouseenter', () => mobileDrawer.classList.add('open'));
        mobileDrawer.addEventListener('mouseleave', () => mobileDrawer.classList.remove('open'));
    }
    if (menuClose && mobileDrawer) {
        menuClose.addEventListener('click', () => mobileDrawer.classList.remove('open'));
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }

    // FAQ Accordion Logic
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', (e) => {
            const item = e.currentTarget.closest('.faq-item');
            if (!item) return;
            
            // Close other items when one is opened
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) otherItem.classList.remove('open');
            });

            item.classList.toggle('open');
            console.log("Toggled FAQ Item:", item);
        });
    });
});