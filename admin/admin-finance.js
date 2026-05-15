document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const payoutBody = document.getElementById('payout-body');
    const killSwitch = document.getElementById('killSwitch');

    async function fetchFinanceData() {
        try {
            // 1. Fetch settings (Kill Switch)
            const settingsRes = await fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
            const settings = await settingsRes.json();
            killSwitch.checked = settings.kill_switch === 'true';
            updateGlobalUIState(killSwitch.checked);

            // 2. Fetch queue
            const payoutRes = await fetch('/api/admin/payouts', { headers: { 'Authorization': `Bearer ${token}` } });
            const queue = await payoutRes.json();
            renderQueue(queue);

            // 3. Fetch Dashboard Stats for Escrow Balance (Site Revenue)
            const statsRes = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } });
            const stats = await statsRes.json();
            document.getElementById('escrow-balance').innerText = `KSH. ${parseFloat(stats.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        } catch (err) { console.error(err); }
    }

    function renderQueue(queue) {
        let totalPending = 0;
        payoutBody.innerHTML = '';
        queue.forEach(p => {
            totalPending += parseFloat(p.amount);
            const isHighRisk = parseInt(p.risk_flags) > 0;
            const row = document.createElement('tr');
            row.className = 'payout-row';
            row.innerHTML = `
                <td>
                    <div style="font-weight: 800;">${p.username}</div>
                    <div style="font-size: 0.6rem; color: #555;">UID: ${p.user_id}-${p.reference_id.substr(-2)}</div>
                </td>
                <td class="amount">KSH. ${parseFloat(p.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="wallet-addr">${p.method.toUpperCase()}</td>
                <td>
                    <span class="trust-score ${isHighRisk ? 'trust-low' : 'trust-high'}">
                        ${isHighRisk ? '⚠ HIGH RISK (' + p.risk_flags + ')' : '✓ LOW RISK'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-action btn-approve" onclick="processPayout(${p.id}, 'completed', ${p.amount})">Approve</button>
                    <button class="btn btn-action btn-reject" onclick="processPayout(${p.id}, 'rejected', ${p.amount})">Reject</button>
                </td>
            `;
            payoutBody.appendChild(row);
        });
        document.getElementById('queue-count').innerText = `Reviewing KSH. ${totalPending.toLocaleString()} in pending settlements.`;
    }

    window.processPayout = async (id, status, amount) => {
        const action = status === 'completed' ? 'RELEASE' : 'REJECT & REFUND';
        if (!confirm(`Confirm ${action} of KSH. ${amount.toLocaleString()}?`)) return;
        
        try {
            const res = await fetch(`/api/admin/payouts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchFinanceData();
        } catch (err) { console.error(err); }
    };

    function updateGlobalUIState(isActive) {
        document.body.style.filter = isActive ? "grayscale(0.8) contrast(1.1)" : "none";
    }

    killSwitch.addEventListener('change', async function() {
        const newState = this.checked;
        if (newState && !confirm("CRITICAL: Freeze all platform operations?")) {
            this.checked = false;
            return;
        }
        
        try {
            await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ kill_switch: newState })
            });
            updateGlobalUIState(newState);
        } catch (err) {
            console.error("Failed to toggle Kill Switch");
            this.checked = !newState;
        }
    });

    fetchFinanceData();
    setInterval(fetchFinanceData, 20000);
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    sidebar.classList.toggle('collapsed');
    openBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
};