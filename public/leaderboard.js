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