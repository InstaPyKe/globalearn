document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    const userList = document.getElementById('userList');
    const searchInput = document.getElementById('searchInput');
    let selectedUserId = null;
    let usersData = [];

    async function fetchUsers(query = '') {
        try {
            const res = await fetch(`/api/admin/users?q=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && Array.isArray(data)) {
                usersData = data;
                renderUserList(usersData);
                document.getElementById('user-count-badge').innerText = `(${usersData.length} records found)`;
            } else {
                console.error("API Error or Invalid Data:", data);
                userList.innerHTML = `<div style="padding:20px; color:var(--pure-red);">Error: ${data.error || 'Failed to load users'}</div>`;
            }
        } catch (err) { 
            console.error("Fetch Error:", err);
            userList.innerHTML = `<div style="padding:20px; color:var(--pure-red);">Connection failed. Check server console.</div>`;
        }
    }

    function renderUserList(users) {
        userList.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = selectedUserId === u.id ? 'selected' : '';
            tr.onclick = () => selectUser(u.id);
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700;">${u.username}</div>
                    <div style="font-size: 0.65rem; color: #555;">UID: ${u.id} • ${u.email}</div>
                </td>
                <td>
                    <span class="status-badge ${(u.kyc_status || 'pending') === 'verified' ? 'verified' : 'pending'}">
                        ${(u.kyc_status || 'pending').toUpperCase()}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="font-weight: 900; color: var(--pure-green);">KSH. ${parseFloat(u.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </td>
            `;
            userList.appendChild(tr);
        });
    }

    function selectUser(id) {
        selectedUserId = id;
        const user = usersData.find(u => u.id === id);
        if (!user) return;

        renderUserList(usersData); // Update selection highlight
        
        // Populate Inspector
        document.getElementById('det-username').innerText = user.username;
        document.getElementById('det-balance').innerText = `KSH. ${parseFloat(user.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('det-earned').innerText = `KSH. ${parseFloat(user.total_earned || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('det-phone').innerText = user.phone || 'Not Provided';
        document.getElementById('det-email').innerText = user.email;
        document.getElementById('det-ip').innerText = user.last_login_ip || '---';
        document.getElementById('det-date').innerText = new Date(user.created_at).toLocaleDateString();
        document.getElementById('det-referrer').innerText = user.referrer_name || 'Direct / Organic';
        document.getElementById('det-wallet').innerText = user.wallet_address || 'Not Set';
        document.getElementById('det-referrals').innerText = `${user.referral_count || 0} Users`;

        // KYC Status
        const badge = document.getElementById('kyc-status-badge');
        badge.innerText = (user.kyc_status || 'PENDING').toUpperCase();
        badge.className = `status-badge ${user.kyc_status === 'pending' || !user.kyc_status ? 'pending' : 'verified'}`;

        document.getElementById('inspector').classList.add('open');
    }

    searchInput.addEventListener('input', (e) => {
        fetchUsers(e.target.value);
    });

    window.handleUserAction = async (action) => {
        if (!selectedUserId) return;
        
        let payload = { action };
        
        if (action === 'adjust_balance') {
            const amount = prompt("Enter amount to adjust (use negative for deduction, e.g. 500 or -500):");
            if (amount === null || amount === "" || isNaN(amount)) return;
            payload.amount = parseFloat(amount);
        } else {
            if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        }

        try {
            const res = await fetch(`/api/admin/users/${selectedUserId}/action`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchUsers(searchInput.value);
            }
        } catch (err) { console.error(err); }
    };

    fetchUsers();
    // Keep data circulating live every 15 seconds
    setInterval(() => fetchUsers(searchInput.value), 15000);
});

window.toggleInspector = function() {
    document.getElementById('inspector').classList.toggle('open');
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    if (openBtn) {
        openBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
    }
};