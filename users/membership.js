document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    async function loadUserData() {
        try {
            const res = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await res.json();
            if (res.ok) {
                document.getElementById('display-username').innerText = user.username;
                const tier = user.membership_tier.toLowerCase();
                if (tier === 'basic' || tier === 'gold' || tier === 'platinum') {
                    const badge = document.getElementById(`current-badge-${tier}`);
                    if (badge) badge.style.display = 'block';
                    const btn = document.getElementById(`btn-${tier}`);
                    if (btn) btn.style.display = 'none';
                }
            }
        } catch (err) { console.error(err); }
    }

    loadUserData();

    window.handleUpgrade = async function(tier, amount) {
        if (!confirm(`Confirm upgrade to ${tier.toUpperCase()} for KSH. ${amount.toLocaleString()}?`)) return;
        try {
            const res = await fetch('/api/membership/upgrade', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ tier, amount })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
            } else {
                alert(data.error || "Request failed");
            }
        } catch (err) {
            alert("Connection error. Please try again.");
        }
    }

    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const overlay = document.getElementById('overlay');

    function toggleSidebar() {
        if (window.innerWidth > 992) {
            sidebar.classList.toggle('collapsed');
            mainWrapper.classList.toggle('expanded');
        } else {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('show');
        }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '../login.html';
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('show');
        }
    });
});