document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const ticketBody = document.getElementById('ticket-body');

    async function fetchSupportData() {
        try {
            // 1. Fetch Stats
            const statsRes = await fetch('/api/admin/support/stats', { headers: { 'Authorization': `Bearer ${token}` } });
            const stats = await statsRes.json();
            document.getElementById('open-tickets').innerText = stats.openTickets;
            document.getElementById('pending-resets').innerText = stats.pendingResets;
            document.getElementById('avg-response').innerText = stats.avgResponse;

            // 2. Fetch Tickets
            const ticketsRes = await fetch('/api/admin/support/tickets', { headers: { 'Authorization': `Bearer ${token}` } });
            const tickets = await ticketsRes.json();
            renderTickets(tickets);
        } catch (err) { console.error(err); }
    }

    function renderTickets(tickets) {
        ticketBody.innerHTML = '';
        tickets.forEach(tk => {
            const row = document.createElement('tr');
            row.className = 'ticket-row';
            
            let statusClass = 'badge-open';
            if (tk.status === 'pending') statusClass = 'badge-pending';
            if (tk.status === 'closed' || tk.status === 'resolved') statusClass = 'badge-closed';

            row.innerHTML = `
                <td>#TK-${tk.id}</td>
                <td>${tk.username}</td>
                <td>${tk.category}</td>
                <td><span class="badge ${statusClass}">${tk.status.replace('_', ' ')}</span></td>
                <td>${new Date(tk.updated_at).toLocaleString()}</td>
                <td><button class="btn-view" onclick="viewTicket(${tk.id})">VIEW</button></td>
            `;
            ticketBody.appendChild(row);
        });
    }

    window.viewTicket = (id) => {
        // For now, simple prompt to update status. In production, this would open a conversation modal.
        const newStatus = prompt("Enter new status (open, pending, resolved, closed):");
        if (newStatus) updateStatus(id, newStatus);
    };

    async function updateStatus(id, status) {
        try {
            const res = await fetch(`/api/admin/support/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchSupportData();
        } catch (err) { console.error(err); }
    }

    fetchSupportData();
    setInterval(fetchSupportData, 30000); // Refresh queue every 30s
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