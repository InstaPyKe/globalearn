document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const list = document.getElementById('messages-list');

    async function fetchMessages() {
        try {
            const res = await fetch('/api/contact/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const messages = await res.json();
            renderMessages(messages);
        } catch (err) {
            list.innerText = "Failed to load messages.";
        }
    }

    function renderMessages(messages) {
        list.innerHTML = '';

        if (messages.length === 0) {
            list.innerHTML = '<div style="color: #444; font-weight: 700; text-align: center; padding: 50px;">NO INQUIRIES RECEIVED YET</div>';
            return;
        }

        messages.forEach(m => {
            const isUnread = m.status === 'pending';
            const div = document.createElement('div');
            div.className = `msg-card ${isUnread ? 'unread' : ''}`;
            div.innerHTML = `
                <div class="msg-header">
                    <div class="sender-info">
                        <span class="sender-name">${m.name}</span> 
                        <span class="sender-email">${m.email}</span>
                    </div>
                    <div class="msg-meta">
                        <span class="timestamp">${new Date(m.created_at).toLocaleString()}</span>
                        <span class="status-badge ${isUnread ? 'status-pending' : 'status-read'}">${m.status}</span>
                    </div>
                </div>
                <span class="msg-subject">SUBJECT: ${m.subject || 'No Subject'}</span>
                <p class="msg-body">${m.message}</p>
                <div class="actions">
                    ${isUnread ? `<button class="btn btn-read" onclick="updateStatus(${m.id}, 'read')">Mark as Read</button>` : ''}
                    <button class="btn btn-delete" onclick="deleteMessage(${m.id})">Delete</button>
                </div>
            `;
            list.appendChild(div);
        });
    }

    window.updateStatus = async (id, status) => {
        try {
            await fetch(`/api/contact/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            fetchMessages();
        } catch (err) { console.error(err); }
    };

    window.deleteMessage = async (id) => {
        if (!confirm("Permanently delete this inquiry?")) return;
        try {
            await fetch(`/api/contact/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchMessages();
        } catch (err) { console.error(err); }
    };

    fetchMessages();
    setInterval(fetchMessages, 30000); // Polling every 30 seconds
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed');
    if (openBtn) {
        openBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
    }
};