document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    async function loadWalletData() {
        try {
            const res = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } });
            const user = await res.json();
            if (res.ok) {
                document.getElementById('display-username').innerText = user.username;
                document.getElementById('total-balance').innerText = `KSH. ${parseFloat(user.balance).toLocaleString()}`;
            }

            const transRes = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
            const transactions = await transRes.json();
            
            let pendingTotal = 0;
            const tbody = document.getElementById('activity-body');
            tbody.innerHTML = '';

            transactions.forEach(t => {
                if (t.status === 'pending') pendingTotal += parseFloat(t.amount);
                const date = new Date(t.created_at).toLocaleDateString();
                const sign = t.type === 'withdrawal' ? '-' : '+';
                const color = t.type === 'withdrawal' ? 'var(--pure-red)' : 'var(--pure-green)';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${t.type.replace('_', ' ')}</td>
                    <td style="color: ${color}">${sign} KSH. ${parseFloat(t.amount).toLocaleString()}</td>
                    <td>${t.method || 'System'}</td>
                    <td><span class="status ${t.status}">${t.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
            document.getElementById('pending-balance').innerText = `KSH. ${pendingTotal.toLocaleString()}`;
        } catch (err) { console.error(err); }
    }

    loadWalletData();

    window.requestPayout = async function() {
        const amt = document.getElementById('amount').value;
        const method = document.getElementById('method').value;
        const destination = document.querySelector('input[type="text"]').value;

        if(amt < 500) return alert("Minimum withdrawal is KSH. 500.00");

        try {
            const res = await fetch('/api/transactions/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: amt, method, destination })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                location.reload();
            } else {
                alert(data.error);
            }
        } catch (err) { alert("Server error"); }
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
});