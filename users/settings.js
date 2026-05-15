document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    async function loadSettings() {
        try {
            const res = await fetch('/api/settings/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            document.getElementById('display-username').innerText = data.username;
            
            const kycText = document.getElementById('kyc-status-text');
            kycText.innerText = data.kyc_status.toUpperCase();
            if (data.kyc_status === 'pending') kycText.style.color = '#FFD700';
            else if (data.kyc_status === 'verified') kycText.style.color = 'var(--pure-green)';
            
            if (data.kyc_status !== 'unverified') {
                document.getElementById('kycDropZone').style.pointerEvents = 'none';
                document.getElementById('upload-text').innerText = 'Document Received';
            }

            if (data.preferred_language) document.getElementById('prefLang').value = data.preferred_language;
            if (data.timezone) document.getElementById('prefTimezone').value = data.timezone;

            const badge = document.getElementById('2fa-status');
            badge.innerText = data.two_fa_enabled ? 'ENABLED' : 'DISABLED';
            badge.style.background = data.two_fa_enabled ? 'var(--pure-green)' : 'var(--pure-red)';
            badge.style.color = data.two_fa_enabled ? '#000' : '#fff';
        } catch (err) { console.error(err); }
    }

    loadSettings();

    window.handleKYCUpload = async function(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const formData = new FormData();
        formData.append('kycDoc', file);
        document.getElementById('upload-text').innerText = "Uploading...";

        try {
            const res = await fetch('/api/settings/kyc/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                location.reload();
            } else {
                alert(data.error);
                document.getElementById('upload-text').innerText = "Click to upload document";
            }
        } catch (err) {
            alert("Upload failed");
            document.getElementById('upload-text').innerText = "Click to upload document";
        }
    }

    window.savePreferences = async function() {
        const language = document.getElementById('prefLang').value;
        const timezone = document.getElementById('prefTimezone').value;
        try {
            const res = await fetch('/api/settings/localization', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ language, timezone })
            });
            const data = await res.json();
            alert(res.ok ? data.message : data.error);
        } catch (err) { alert("Update failed"); }
    }

    window.updatePassword = async function() {
        const currentPassword = document.getElementById('currentPass').value;
        const newPassword = document.getElementById('newPass').value;
        if (!currentPassword || !newPassword) return alert("Please fill both fields");
        try {
            const res = await fetch('/api/settings/password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                location.reload();
            } else { alert(data.error); }
        } catch (err) { alert("Update failed"); }
    }

    const toggle2faBtn = document.getElementById('toggle2faBtn');
    if (toggle2faBtn) {
        toggle2faBtn.onclick = async () => {
            try {
                const res = await fetch('/api/settings/2fa/toggle', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    loadSettings();
                }
            } catch (err) { alert("Action failed"); }
        };
    }

    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth > 992) {
                sidebar.classList.toggle('collapsed');
                mainWrapper.classList.toggle('expanded');
            } else { sidebar.classList.toggle('active'); }
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '../login.html';
    });
});