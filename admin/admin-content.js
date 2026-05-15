document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const taskGrid = document.getElementById('taskGrid');
    const deployForm = document.getElementById('deployForm');
    let allTasks = [];

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

    async function fetchTasks() {
        try {
            const res = await fetch('/api/admin/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allTasks = await res.json();
            renderTasks(allTasks);
        } catch (err) { console.error(err); }
    }

    function renderTasks(tasks) {
        taskGrid.innerHTML = '';
        tasks.forEach(t => {
            const progress = Math.min((t.current_views / t.view_cap) * 100, 100);
            const card = document.createElement('div');
            card.className = 'ad-card';
            card.innerHTML = `
                <div class="price-tag">KSH. ${parseFloat(t.reward).toFixed(2)} / VIEW</div>
                <div class="thumbnail-mock">TASK_ID: ${t.id}</div>
                <h3 style="font-size: 0.9rem; font-weight: 800;">${t.title}</h3>
                <p style="font-size: 0.65rem; color: #555; margin-top: 5px; word-break: break-all;">${t.video_url}</p>
                
                <div class="cap-container">
                    <div class="cap-header">
                        <span>DAILY CAP PROGRESS</span>
                        <span style="color: #fff;">${t.current_views} / ${t.view_cap}</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-action" style="margin-top:0;" onclick="toggleStatus(${t.id})">
                        ${t.is_active ? 'PAUSE' : 'RESUME'}
                    </button>
                    <button class="btn-action" style="margin-top:0; border-color: var(--pure-blue); color: var(--pure-blue);" onclick="prepareEdit(${t.id})">EDIT</button>
                    <button class="btn-action" style="margin-top:0; border-color: var(--pure-red); color: var(--pure-red);" onclick="deleteTask(${t.id})">DELETE</button>
                </div>
            `;
            taskGrid.appendChild(card);
        });
    }

    deployForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editTaskId').value;
        const payload = {
            title: document.getElementById('taskTitle').value,
            url: document.getElementById('taskUrl').value,
            reward: document.getElementById('taskReward').value,
            cap: document.getElementById('taskCap').value
        };

        try {
            const url = editId ? `/api/admin/tasks/${editId}` : '/api/admin/tasks';
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                deployForm.reset();
                document.getElementById('editTaskId').value = '';
                document.getElementById('submitBtn').innerText = 'Deploy Task';
                fetchTasks();
                showToast(editId ? 'Task updated successfully' : 'Task deployed to production successfully');
            } else {
                showToast(data.error || 'Deployment failed', 'error');
            }
        } catch (err) { console.error(err); }
    });

    window.toggleStatus = async (id) => {
        try {
            const res = await fetch(`/api/admin/tasks/${id}/status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                fetchTasks();
                showToast(data.message);
            }
        } catch (err) { console.error(err); }
    };

    window.deleteTask = async (id) => {
        if (!confirm('Permanently delete this task? This will also remove all user completion data for this specific task.')) return;
        try {
            const res = await fetch(`/api/admin/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchTasks();
                showToast('Task permanently purged from database');
            }
        } catch (err) { console.error(err); }
    };

    window.prepareEdit = (id) => {
        const task = allTasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById('editTaskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskUrl').value = task.video_url;
        document.getElementById('taskReward').value = task.reward;
        document.getElementById('taskCap').value = task.view_cap;
        
        document.getElementById('submitBtn').innerText = 'Update Task';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    fetchTasks();
    // Poll for changes every 15 seconds to sync with DBeaver/external edits
    setInterval(fetchTasks, 15000);
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    sidebar.classList.toggle('collapsed');
    openBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
};