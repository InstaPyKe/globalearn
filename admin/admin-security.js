document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const incidentList = document.getElementById('incident-list');

    async function fetchSecurityData() {
        try {
            // 1. Fetch Stats
            const statsRes = await fetch('/api/admin/security/stats', { headers: { 'Authorization': `Bearer ${token}` } });
            const stats = await statsRes.json();
            document.getElementById('ip-conflicts').innerText = stats.ipConflicts;
            document.getElementById('device-clusters').innerText = stats.deviceClusters;
            document.getElementById('vpn-detected').innerText = stats.vpnDetected;

            // 2. Fetch Incidents
            const incidentsRes = await fetch('/api/admin/security/incidents', { headers: { 'Authorization': `Bearer ${token}` } });
            const incidents = await incidentsRes.json();
            renderIncidents(incidents);
            
            document.getElementById('scan-indicator').innerText = `SCANNED ${new Date().toLocaleTimeString()} AGO`;
        } catch (err) { console.error(err); }
    }

    function renderIncidents(incidents) {
        incidentList.innerHTML = '';
        if (incidents.length === 0) {
            incidentList.innerHTML = '<div style="padding: 40px; text-align: center; color: #444; font-weight: 800;">NO ACTIVE THREATS DETECTED</div>';
            return;
        }

        incidents.forEach(inc => {
            const meta = inc.metadata || {};
            const isCritical = inc.type === 'multi_account' || inc.type === 'device_cluster';
            const row = document.createElement('div');
            row.className = `alert-row ${isCritical ? 'critical' : ''}`;
            row.innerHTML = `
                <div>
                    <span class="conflict-tag">${inc.type.replace('_', ' ')}</span>
                    <div style="font-weight: 800; font-size: 0.9rem;">${inc.username || 'System Alert'}</div>
                    <div style="font-size: 0.7rem; color: #666;">${inc.description}</div>
                </div>
                <div>
                    <span class="conflict-tag">Network Info</span>
                    <div style="font-family: monospace; font-size: 0.8rem;">IP: ${meta.ip || 'Unknown'}</div>
                    <div style="font-size: 0.65rem; color: #666;">HWID: ${meta.hwid || 'N/A'}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; font-weight: 800; color: ${isCritical ? 'var(--pure-red)' : 'var(--gold)'};">
                        STATUS: ACTIVE
                    </div>
                    <div style="font-size: 0.65rem; color: #444;">Logged: ${new Date(inc.created_at).toLocaleString()}</div>
                </div>
                <div style="text-align: right;">
                    <button class="btn-ban" onclick="resolveIncident(${inc.id})">
                        ${isCritical ? 'Resolve' : 'Clear Flag'}
                    </button>
                </div>
            `;
            incidentList.appendChild(row);
        });
    }

    window.resolveIncident = async (id) => {
        try {
            const res = await fetch(`/api/admin/security/resolve/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchSecurityData();
        } catch (err) { console.error(err); }
    };

    fetchSecurityData();
    setInterval(fetchSecurityData, 15000); // Auto-refresh every 15s
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
        openBtn.style.display = 'block';
    } else {
        openBtn.style.display = 'none';
    }
};