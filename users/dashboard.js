document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    let trendChart, distChart;

    function initCharts() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { 
                        color: '#555', 
                        font: { size: 10 },
                        callback: (value) => 'KSH. ' + value.toLocaleString()
                    } 
                },
                x: { grid: { display: false }, ticks: { color: '#555', font: { size: 10 } } }
            }
        };

        trendChart = new Chart(document.getElementById('earningTrendChart'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Earnings',
                    data: [120, 190, 300, 250, 400, 380, 520], // Sample data
                    borderColor: '#0000FF',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { 
                ...commonOptions, 
                plugins: { 
                    title: { display: true, text: 'WEEKLY REVENUE TREND', color: '#888', font: { size: 12, weight: 'bold' } },
                    tooltip: {
                        callbacks: { label: (context) => `Earnings: KSH. ${context.raw.toLocaleString()}` }
                    }
                } 
            }
        });

        distChart = new Chart(document.getElementById('taskDistributionChart'), {
            type: 'bar',
            data: {
                labels: ['Videos', 'Spins', 'Ads', 'Invites'],
                datasets: [{
                    data: [12, 19, 3, 5], // Sample data
                    backgroundColor: ['#00FF00', '#0000FF', '#9B59B6', '#FF0000'],
                    borderRadius: 5,
                    barThickness: 25
                }]
            },
            options: { ...commonOptions, plugins: { title: { display: true, text: 'TASK COMPLETION VOLUME', color: '#888', font: { size: 12, weight: 'bold' } } } }
        });
    }

    async function loadDashboardData() {
        try {
            // 1. Fetch Profile (Username & Balance)
            const profileRes = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const profile = await profileRes.json();
            
            document.getElementById('display-username').innerText = profile.username;
            document.getElementById('welcome-text').innerText = `Welcome Back, ${profile.username}`;
            document.getElementById('display-balance').innerText = `KSH. ${parseFloat(profile.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

            // 2. Fetch Network Stats (Team Count)
            const networkRes = await fetch('/api/referrals/network', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const network = await networkRes.json();
            const totalNetwork = (network.level1?.length || 0) + (network.level2?.length || 0) + (network.level3?.length || 0);
            document.getElementById('network-count').innerText = `${totalNetwork} Users`;

            // 3. Fetch Tasks for Progress & Priority List
            const tasksRes = await fetch('/api/tasks/available', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasksData = await tasksRes.json();
            
            // Task Progress Logic
            if (tasksData.limitReached) {
                document.getElementById('task-progress').innerText = `100%`;
                document.getElementById('priority-tasks-list').innerHTML = `<div style="color:var(--pure-red); font-size: 0.85rem;">Daily limit reached. Resets in ${Math.floor(tasksData.secondsLeft / 3600)}h.</div>`;
            } else {
                // If not at limit, progress is partial. (Example logic)
                document.getElementById('task-progress').innerText = `0%`; 
                renderPriorityTasks(tasksData.filter(t => t.task_type === 'video').slice(0, 3));
            }

            // Update charts with live task counts if available
            distChart.data.datasets[0].data[0] = tasksData.length || 0;
            distChart.update();

        } catch (err) {
            console.error("Dashboard Load Error:", err);
        }
    }

    function renderPriorityTasks(tasks) {
        const container = document.getElementById('priority-tasks-list');
        if (tasks.length === 0) {
            container.innerHTML = `<div style="color: #444;">No new tasks available.</div>`;
            return;
        }
        container.innerHTML = '';
        tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'task-action-btn';
            div.onclick = () => window.location.href = 'earning-hub.html';
            div.innerHTML = `
                <span>${task.title}</span>
                <span style="color: var(--pure-green); font-weight: 900; font-size: 1rem;">+ KSH. ${parseFloat(task.reward).toFixed(2)}</span>
            `;
            container.appendChild(div);
        });
    }

    // Navigation UI Logic
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const overlay = document.getElementById('overlay');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth > 992) {
                sidebar.classList.toggle('collapsed');
                mainWrapper.classList.toggle('expanded');
            } else {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('show');
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('show');
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '../login.html';
    });

    initCharts();
    loadDashboardData();
});