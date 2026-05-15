document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    let trendChart, distChart, tierChart;

    function initCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    grid: { color: 'rgba(255,255,255,0.03)' }, 
                    ticks: { 
                        color: '#444', 
                        font: { size: 10 },
                        callback: (value) => value >= 1000 ? (value/1000).toFixed(1) + 'k' : value
                    } 
                },
                x: { grid: { display: false }, ticks: { color: '#444', font: { size: 10 } } }
            }
        };

        trendChart = new Chart(document.getElementById('adminTaskTrendChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#00FF00',
                    backgroundColor: 'rgba(0,255,0,0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: chartOptions
        });

        distChart = new Chart(document.getElementById('adminTaskDistChart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#0000FF', '#9B59B6', '#FF0000', '#00FF00', '#F1C40F'],
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: chartOptions
        });

        tierChart = new Chart(document.getElementById('membershipTierChart'), {
            type: 'doughnut',
            data: {
                labels: ['BASIC', 'GOLD', 'PLATINUM'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#444', '#F1C40F', '#FF0000'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: { ...chartOptions, cutout: '70%' }
        });
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                document.getElementById('total-users').innerText = data.totalUsers.toLocaleString();
                document.getElementById('users-today').innerText = `+${data.newUsersToday} NEW TODAY`;
                
                document.getElementById('revenue').innerText = `KSH. ${parseFloat(data.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                document.getElementById('liability').innerText = `KSH. ${parseFloat(data.liability || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                document.getElementById('profit').innerText = `KSH. ${parseFloat(data.netProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                document.getElementById('margin').innerText = `${parseFloat(data.margin).toFixed(1)}% PROFIT MARGIN`;

                document.getElementById('fraud-flags').innerText = `${data.activeFraudFlags} Accounts Flagged`;
                document.getElementById('pending-withdrawals').innerText = `${data.pendingWithdrawals} Requests`;
                document.getElementById('server-load').innerText = `Optimal (${data.serverLoad}%)`;

                // Update Charts
                trendChart.data.labels = data.taskTrend.map(i => i.label);
                trendChart.data.datasets[0].data = data.taskTrend.map(i => i.value);
                trendChart.update();

                distChart.data.labels = data.taskDist.map(i => i.label);
                distChart.data.datasets[0].data = data.taskDist.map(i => i.value);
                distChart.update();

                // Update Tier Chart (Matching User Packages)
                tierChart.data.labels = data.tierDist.map(i => i.label.toUpperCase());
                tierChart.data.datasets[0].data = data.tierDist.map(i => i.value);
                tierChart.update();
            }
        } catch (err) {
            console.error("Failed to load dashboard metrics");
        }
    }

    initCharts();
    fetchStats();
    // Refresh stats every 30 seconds
    setInterval(fetchStats, 30000);
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    if (!sidebar || !openBtn) return;

    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
        openBtn.style.display = 'block';
    } else {
        openBtn.style.display = 'none';
    }
}

// Expose to global scope for the HTML onclick attribute
window.toggleSidebar = toggleSidebar;