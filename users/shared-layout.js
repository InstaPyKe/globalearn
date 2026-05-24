/**
 * shared-layout.js
 * Centralized UI controller for Sidebar, Header Navigation, and common interactions.
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const overlay = document.getElementById('overlay');

    // --- SIDEBAR & HEADER TOGGLE ---
    const toggleSidebar = () => {
        if (window.innerWidth > 992) {
            // Desktop: Expansion behavior
            sidebar?.classList.toggle('expanded');
            mainWrapper?.classList.toggle('shifted');
            
            // Support for legacy class implementations
            sidebar?.classList.toggle('collapsed');
            mainWrapper?.classList.toggle('expanded');
        } else {
            // Mobile: Drawer behavior
            sidebar?.classList.toggle('active');
            overlay?.classList.toggle('show');
        }
    };

    // Attach listeners to all possible toggle buttons
    document.getElementById('topNavToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('toggleBtn')?.addEventListener('click', toggleSidebar);
    
    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('show');
    });

    // --- BACK TO TOP LOGIC ---
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});