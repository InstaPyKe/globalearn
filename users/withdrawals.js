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
                document.getElementById('display-balance').innerText = `KSH. ${parseFloat(user.balance).toLocaleString()}`;
                document.getElementById('display-lifetime').innerText = `KSH. ${parseFloat(user.lifetime_earnings || 0).toLocaleString()}`;
                document.getElementById('withdraw-amount').value = parseFloat(user.balance).toFixed(2);
            }

            const transRes = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
            const history = await transRes.json();
            const tbody = document.getElementById('history-body');
            tbody.innerHTML = '';

            history.filter(t => t.type === 'withdrawal').forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${t.id}</td>
                    <td>${t.method}</td>
                    <td>${new Date(t.created_at).toLocaleDateString()}</td>
                    <td style="font-weight: 800;">KSH. ${parseFloat(t.amount).toLocaleString()}</td>
                    <td><span class="status ${t.status}">${t.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    loadUserData();

    window.handleWithdrawal = async function() {
        const amount = document.getElementById('withdraw-amount').value;
        const method = document.getElementById('method').value;
        const destination = document.getElementById('destination').value;

        try {
            const res = await fetch('/api/transactions/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount, method, destination })
            });
            const data = await res.json();
            alert(data.message || data.error);
            if (res.ok) location.reload();
        } catch (err) { alert("Error"); }
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