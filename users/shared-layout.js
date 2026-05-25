/**
 * shared-layout.js
 * Professional UI controller for Sidebar and Header Navigation.
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const topNavToggle = document.getElementById('topNavToggle');

    const toggleSidebar = () => {
        if (window.innerWidth > 992) {
            // Desktop: Toggle between mini and full width
            sidebar?.classList.toggle('expanded');
        } else {
            // Mobile: Toggle overlay drawer
            sidebar?.classList.toggle('active');
            overlay?.classList.toggle('show');
        }
    };

    topNavToggle?.addEventListener('click', toggleSidebar);
    
    // Close mobile menu by clicking outside
    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('show');
    });

    // Handle viewport resize to clean up states
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar?.classList.remove('active');
            overlay?.classList.remove('show');
        }
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