document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const settingsForm = document.getElementById('settingsForm');

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function fetchSettings() {
        try {
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const settings = await res.json();
            
            // Populate fields based on setting_key matches id
            for (const [key, value] of Object.entries(settings)) {
                const input = document.getElementById(key);
                if (input) input.value = value;
            }
        } catch (err) { console.error(err); }
    }

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            ref_l1: document.getElementById('ref_l1').value,
            ref_l2: document.getElementById('ref_l2').value,
            ref_l3: document.getElementById('ref_l3').value,
            min_payout: document.getElementById('min_payout').value,
            daily_payout_limit: document.getElementById('daily_payout_limit').value,
            service_fee: document.getElementById('service_fee').value
        };

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
            } else {
                showToast(data.error || 'Update failed', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });

    fetchSettings();
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    if (!sidebar || !openBtn) return;

    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
        openBtn.style.display = 'block';
    } else {
        openBtn.style.display = 'none';
    }
};