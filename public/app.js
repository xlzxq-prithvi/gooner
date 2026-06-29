const socket = io();
let currentView = 'dashboard';
let selectedBots = []; // For multi-bot control
let activityChart = null;
let statsChart = null;

// ==========================================
// ROUTING & VIEW RENDERING
// ==========================================
const views = {
    dashboard: renderDashboard,
    bots: renderBots,
    commands: renderCommands,
    movement: renderMovement,
    animations: renderAnimations,
    chat: renderChat,
    console: renderConsole,
    statistics: renderStatistics,
    settings: renderSettings
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem) activeItem.classList.remove('active');
        
        item.classList.add('active');
        currentView = item.dataset.view;
        document.getElementById('page-title').innerText = item.innerText;
        views[currentView]();
    });
});

function renderView(html) {
    document.getElementById('view-container').innerHTML = html;
}

// ==========================================
// VIEWS
// ==========================================
function renderDashboard() {
    renderView(`
        <div class="stats-grid">
            ${createStatCard('Total Bots', 'stat-total')}
            ${createStatCard('Connected', 'stat-connected')}
            ${createStatCard('Reconnects', 'stat-reconnects')}
            ${createStatCard('Msgs Received', 'stat-msgs-rec')}
            ${createStatCard('Msgs Sent', 'stat-msgs-sent')}
            ${createStatCard('Commands Executed', 'stat-cmds')}
            ${createStatCard('Memory Usage', 'stat-mem')}
            ${createStatCard('CPU Usage', 'stat-cpu')}
            ${createStatCard('Uptime (min)', 'stat-uptime')}
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">Server Activity (Last 30s)</div></div>
            <canvas id="activityChart" height="100"></canvas>
        </div>
    `);
    initDashboardChart();
}

function renderBots() {
    renderView(`
        <div class="card">
            <div class="card-header">
                <div class="card-title">Active Bot Instances</div>
                <input type="text" id="bot-search" placeholder="Search bots..." style="width: 200px;">
            </div>
            <table class="bot-table">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="select-all"></th>
                        <th>Bot Name</th>
                        <th>Status</th>
                        <th>Health</th>
                        <th>Food</th>
                        <th>Position (X, Y, Z)</th>
                        <th>Item</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="bot-table-body">
                    <tr><td colspan="8" style="text-align:center; color:var(--text-secondary);">Waiting for bot data...</td></tr>
                </tbody>
            </table>
        </div>
    `);
    
    document.getElementById('select-all').addEventListener('change', (e) => {
        if (e.target.checked) selectedBots = Array.from(document.querySelectorAll('.bot-checkbox')).map(cb => cb.value);
        else selectedBots = [];
        document.querySelectorAll('.bot-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateSelectedCount();
    });
}

function renderCommands() {
    renderView(`
        <div class="card">
            <div class="card-header"><div class="card-title">Command Center (Selected: <span id="sel-count">0</span>)</div></div>
            <div class="cmd-grid">
                <div class="card" style="margin:0; padding:16px;">
                    <h3>Movement</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;">
                        <button class="btn btn-primary" onclick="execCmd('forward 10')">Walk Forward 10</button>
                        <button class="btn btn-primary" onclick="execCmd('back 10')">Walk Back 10</button>
                        <button class="btn btn-primary" onclick="execCmd('left 5')">Strafe Left 5</button>
                        <button class="btn btn-primary" onclick="execCmd('right 5')">Strafe Right 5</button>
                        <button class="btn btn-primary" onclick="execCmd('jump')">Toggle Jump</button>
                        <button class="btn btn-primary" onclick="execCmd('sprint')">Toggle Sprint</button>
                        <button class="btn btn-danger" onclick="execCmd('stop')">Stop All Movement</button>
                    </div>
                </div>
                <div class="card" style="margin:0; padding:16px;">
                    <h3>Combat / Items</h3>
                    <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
                        <button class="btn btn-primary" onclick="execCmd('lc')">Toggle Left Click Spam</button>
                        <button class="btn btn-primary" onclick="execCmd('click left')">Left Click Once</button>
                        <button class="btn btn-primary" onclick="execCmd('click right')">Right Click</button>
                        <div class="cmd-form-group">
                            <label class="cmd-label">Switch Hotbar Slot (1-9)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="number" id="slot-num" min="1" max="9" value="1">
                                <button class="btn btn-ghost" onclick="execCmd('slot ' + document.getElementById('slot-num').value)">Set Slot</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card" style="margin:0; padding:16px;">
                    <h3>Utility</h3>
                    <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
                        <button class="btn btn-primary" onclick="execCmd('p')">Toggle Party Accept</button>
                        <button class="btn btn-primary" onclick="execCmd('farm')">Toggle Farm Mode</button>
                        <button class="btn btn-primary" onclick="execCmd('gravity')">Toggle Antigravity</button>
                        <button class="btn btn-primary" onclick="execCmd('bw')">Start BedWars Join</button>
                        <button class="btn btn-primary" onclick="execCmd('rotate')">Toggle Rotate</button>
                        <button class="btn btn-primary" onclick="execCmd('shift')">Toggle Sneak</button>
                    </div>
                </div>
            </div>
        </div>
    `);
    updateSelectedCount();
}

function renderMovement() {
    renderView(`
        <div class="card">
            <div class="card-header"><div class="card-title">Live Telemetry</div></div>
            <p style="color:var(--text-secondary);">Select bots on the Bots page to view their detailed telemetry here.</p>
            <div id="movement-telemetry" class="stats-grid">
                <!-- Populated by socket update -->
            </div>
        </div>
    `);
}

function renderAnimations() {
    const animForm = (name, params) => `
        <div class="card" style="margin:0; padding:16px;">
            <h3 style="text-transform:capitalize;">${name}</h3>
            ${params.map(p => `
                <div class="cmd-form-group">
                    <label class="cmd-label">${p.label}</label>
                    <input type="${p.type || 'text'}" id="${name}-${p.id}" value="${p.default || ''}">
                </div>
            `).join('')}
            <div style="display:flex; gap:8px; margin-top:8px;">
                <button class="btn btn-success" onclick="execAnim('${name}')">Start</button>
                <button class="btn btn-danger" onclick="execCmd('${name} stop')">Stop</button>
            </div>
        </div>
    `;
    
    renderView(`
        <div class="cmd-grid">
            ${animForm('orbit', [{id:'cx', label:'Center X', type:'number'}, {id:'cz', label:'Center Z', type:'number'}, {id:'r', label:'Radius', type:'number', default:'5'}, {id:'s', label:'Speed', type:'number', default:'0.05'}, {id:'f', label:'Facing (in/out/tangent)', default:'tangent'}])}
            ${animForm('forbit', [{id:'user', label:'Target User'}, {id:'r', label:'Radius', type:'number', default:'5'}, {id:'s', label:'Speed', type:'number', default:'0.005'}, {id:'f', label:'Facing', default:'tangent'}])}
            ${animForm('trick1', [{id:'cx', label:'Center X', type:'number'}, {id:'cz', label:'Center Z', type:'number'}, {id:'r', label:'Radius', type:'number', default:'8'}, {id:'amp', label:'Amplitude', type:'number', default:'3'}, {id:'s', label:'Speed', type:'number', default:'0.05'}])}
            ${animForm('trick2', [{id:'cx', label:'Center X', type:'number'}, {id:'cz', label:'Center Z', type:'number'}, {id:'r', label:'Radius', type:'number', default:'8'}, {id:'amp', label:'Amplitude', type:'number', default:'3'}, {id:'s', label:'Speed', type:'number', default:'0.05'}])}
            ${animForm('wjump', [{id:'cx', label:'Center X', type:'number'}, {id:'cz', label:'Center Z', type:'number'}, {id:'r', label:'Radius', type:'number', default:'8'}, {id:'h', label:'Jump Height', type:'number', default:'2'}, {id:'s', label:'Speed', type:'number', default:'0.08'}])}
            ${animForm('star', [{id:'cx', label:'Center X', type:'number'}, {id:'cz', label:'Center Z', type:'number'}, {id:'or', label:'Outer Radius', type:'number', default:'10'}, {id:'ir', label:'Inner Radius', type:'number', default:'4'}, {id:'s', label:'Speed', type:'number', default:'0.001'}])}
            ${animForm('fly', [{id:'dir', label:'Direction (up/down)'}, {id:'blocks', label:'Blocks', type:'number', default:'10'}, {id:'s', label:'Speed', type:'number', default:'0.1'}])}
            ${animForm('follow', [{id:'user', label:'Target User'}, {id:'r', label:'Radius', type:'number', default:'3'}, {id:'s', label:'Speed', type:'number', default:'0.28'}])}
        </div>
    `);
}

function renderConsole() {
    renderView(`
        <div class="card">
            <div class="card-header">
                <div class="card-title">Live Console</div>
                <div style="display:flex; gap:8px;">
                    <select id="log-filter" style="width: 150px;">
                        <option value="all">All Logs</option>
                        <option value="Info">Info</option>
                        <option value="Commands">Commands</option>
                        <option value="Chat">Chat</option>
                        <option value="Error">Errors</option>
                    </select>
                    <button class="btn btn-ghost" onclick="clearConsole()">Clear</button>
                </div>
            </div>
            <div class="console-view" id="console-output"></div>
        </div>
    `);
}

function renderChat() {
    renderView(`
        <div class="card">
            <div class="card-header"><div class="card-title">Broadcast Chat</div></div>
            <p style="color:var(--text-secondary); margin-bottom:16px;">Messages sent here will be broadcasted as in-game chat to ALL connected bots.</p>
            <div style="display:flex; gap:8px;">
                <input type="text" id="chat-input" placeholder="Type message to broadcast..." onkeypress="if(event.key==='Enter') sendChat()">
                <button class="btn btn-primary" onclick="sendChat()">Send</button>
            </div>
        </div>
    `);
}

function renderStatistics() {
    renderView(`
        <div class="stats-grid">
            ${createStatCard('Total Reconnects', 'stat-reconnects-2')}
            ${createStatCard('Total Msgs Received', 'stat-msgs-rec-2')}
            ${createStatCard('Total Msgs Sent', 'stat-msgs-sent-2')}
            ${createStatCard('Total Cmds Executed', 'stat-cmds-2')}
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">System Resource Usage</div></div>
            <canvas id="statsChart" height="100"></canvas>
        </div>
    `);
    initStatsChart();
}

function renderSettings() {
    renderView(`
        <div class="card">
            <div class="card-header"><div class="card-title">Configuration</div></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="cmd-form-group">
                    <label class="cmd-label">Server Host</label>
                    <input type="text" value="eu.mineberry.net" disabled>
                </div>
                <div class="cmd-form-group">
                    <label class="cmd-label">Server Port</label>
                    <input type="text" value="25565" disabled>
                </div>
                <div class="cmd-form-group">
                    <label class="cmd-label">Minecraft Version</label>
                    <input type="text" value="1.8" disabled>
                </div>
                <div class="cmd-form-group">
                    <label class="cmd-label">Bot Mode (Requires Backend Restart)</label>
                    <select id="set-mode">
                        <option value="a">A (Login Cycler)</option>
                        <option value="b">B (Play Controller)</option>
                        <option value="c">C (Custom Usernames)</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="saveSettings()">Save Settings</button>
        </div>
    `);
    
    // Load current config
    fetch('/api/status').then(r => r.json()).then(d => {
        document.getElementById('set-mode').value = d.currentMode.toLowerCase();
    });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function createStatCard(label, id) {
    return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value" id="${id}">0</div></div>`;
}

function updateSelectedCount() {
    const countEl = document.getElementById('sel-count');
    if (countEl) countEl.innerText = selectedBots.length;
}

function execCmd(baseCmd) {
    let cmdStr = '';
    if (selectedBots.length === 1) {
        // If only one bot is selected, target it directly
        cmdStr = `!bot ${selectedBots[0]} ${baseCmd}`;
    } else {
        // If 0 or multiple are selected, the script natively broadcasts to all
        cmdStr = `!${baseCmd}`;
    }
    fetch('/api/command', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({command: cmdStr}) });
    showToast('Command Sent', cmdStr, 'info');
}

function execAnim(name) {
    const params = Array.from(document.querySelectorAll(`[id^="${name}-"]`)).map(i => i.value).join(' ');
    execCmd(`${name} ${params}`);
}

function sendChat() {
    const msg = document.getElementById('chat-input').value;
    if (!msg) return;
    fetch('/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message: msg}) });
    document.getElementById('chat-input').value = '';
    showToast('Chat Broadcast', msg, 'success');
}

function clearConsole() {
    document.getElementById('console-output').innerHTML = '';
}

function saveSettings() {
    const mode = document.getElementById('set-mode').value;
    fetch('/api/settings', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ mode: mode }) 
    }).then(() => showToast('Settings Saved', 'Restart the backend to apply changes.', 'success'));
}

function showToast(title, msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    let borderColor = 'var(--accent-primary)';
    if (type === 'success') borderColor = 'var(--success)';
    if (type === 'danger') borderColor = 'var(--danger)';
    if (type === 'info') borderColor = 'var(--info)';
    
    toast.style.borderLeftColor = borderColor;
    toast.innerHTML = `<strong>${title}</strong><br><span style="color:var(--text-secondary); font-size:12px;">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// CHARTING
// ==========================================
function initDashboardChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(30).fill(''),
            datasets: [{
                label: 'Online Bots',
                data: Array(30).fill(0),
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { display: false }, grid: { display: false } }
            }
        }
    });
}

function initStatsChart() {
    const ctx = document.getElementById('statsChart').getContext('2d');
    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(30).fill(''),
            datasets: [
                {
                    label: 'Memory Usage (%)',
                    data: Array(30).fill(0),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'CPU Usage (MB)',
                    data: Array(30).fill(0),
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#E2E8F0' } } },
            scales: { 
                y: { beginAtZero: true, ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { display: false }, grid: { display: false } }
            }
        }
    });
}

// ==========================================
// REAL-TIME LISTENERS
// ==========================================
socket.on('console_log', (log) => {
    if (currentView === 'console') {
        const consoleDiv = document.getElementById('console-output');
        if (consoleDiv) {
            const filter = document.getElementById('log-filter')?.value || 'all';
            if (filter === 'all' || log.category === filter) {
                consoleDiv.innerHTML += `<div class="log-line log-${log.category.toLowerCase().replace(' ', '-')}">[${new Date(log.timestamp).toLocaleTimeString()}] [${log.bot}] ${log.message}</div>`;
                consoleDiv.scrollTop = consoleDiv.scrollHeight;
            }
        }
    }
    
    if (log.category === 'Disconnect') showToast('Bot Disconnected', `${log.bot}: ${log.message}`, 'danger');
    if (log.category === 'Success' && log.message.includes('Logged in')) showToast('Bot Connected', log.bot, 'success');
});

socket.on('bot_update', (bots) => {
    // Update Topbar
    document.getElementById('t-online').innerText = bots.length;
    
    // Update Dashboard Stats
    if (currentView === 'dashboard') {
        document.getElementById('stat-total').innerText = bots.length;
        document.getElementById('stat-connected').innerText = bots.length;
        if (activityChart) {
            activityChart.data.datasets[0].data.shift();
            activityChart.data.datasets[0].data.push(bots.length);
            activityChart.update('none');
        }
    }
    
    // Update Bots Table
    if (currentView === 'bots') {
        const tbody = document.getElementById('bot-table-body');
        if (tbody) {
            if (bots.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary);">No bots connected. Waiting for logins...</td></tr>`;
            } else {
                tbody.innerHTML = bots.map(b => `
                    <tr>
                        <td><input type="checkbox" class="bot-checkbox" value="${b.username}" ${selectedBots.includes(b.username) ? 'checked' : ''} onchange="toggleBotSelection('${b.username}')"></td>
                        <td><strong>${b.username}</strong></td>
                        <td><span class="dot online"></span> Online</td>
                        <td>${b.health.toFixed(1)} ❤️</td>
                        <td>${b.food.toFixed(1)} 🍗</td>
                        <td>${b.position.x}, ${b.position.y}, ${b.position.z}</td>
                        <td>${b.heldItem}</td>
                        <td><button class="btn btn-danger" style="padding:6px 12px;" onclick="execSingleCmd('${b.username}', 'stop')">Stop</button></td>
                    </tr>
                `).join('');
            }
        }
    }

    // Update Movement Telemetry
    if (currentView === 'movement') {
        const telemDiv = document.getElementById('movement-telemetry');
        if (telemDiv) {
            if (selectedBots.length === 0) {
                telemDiv.innerHTML = `<p style="color:var(--text-secondary);">Go to the Bots page and select a bot to view live telemetry.</p>`;
            } else {
                telemDiv.innerHTML = bots.filter(b => selectedBots.includes(b.username)).map(b => `
                    <div class="stat-card">
                        <div class="stat-label">${b.username}</div>
                        <div style="font-size: 14px; margin-top: 8px; line-height: 1.8;">
                            Pos: ${b.position.x}, ${b.position.y}, ${b.position.z}<br>
                            Yaw: ${b.yaw} | Pitch: ${b.pitch}<br>
                            Vel: ${b.velocity.x}, ${b.velocity.y}, ${b.velocity.z}<br>
                            Health: ${b.health.toFixed(1)} | Food: ${b.food.toFixed(1)}<br>
                            Physics: ${b.physicsEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                    </div>
                `).join('');
            }
        }
    }
});

function toggleBotSelection(username) {
    const idx = selectedBots.indexOf(username);
    if (idx > -1) selectedBots.splice(idx, 1);
    else selectedBots.push(username);
    updateSelectedCount();
}

function execSingleCmd(username, cmd) {
    fetch('/api/command', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({command: `!bot ${username} ${cmd}`}) });
}

// Topbar Time
setInterval(() => {
    document.getElementById('t-time').innerText = new Date().toLocaleTimeString();
}, 1000);

// Fetch system status every 2 seconds
setInterval(fetchStatus, 2000);
function fetchStatus() {
    fetch('/api/status').then(r => r.json()).then(d => {
        document.getElementById('t-mode').innerText = d.currentMode;
        document.getElementById('t-cpu').innerText = d.cpuUsage.toFixed(1) + '%';
        document.getElementById('t-ram').innerText = d.memUsage.toFixed(1) + '%';
        
        if (currentView === 'dashboard') {
            document.getElementById('stat-reconnects').innerText = d.stats.reconnects;
            document.getElementById('stat-msgs-rec').innerText = d.stats.msgsReceived;
            document.getElementById('stat-msgs-sent').innerText = d.stats.msgsSent;
            document.getElementById('stat-cmds').innerText = d.stats.cmdsExecuted;
            document.getElementById('stat-mem').innerText = d.memUsage.toFixed(1) + '%';
            document.getElementById('stat-cpu').innerText = d.cpuUsage.toFixed(1) + '%';
            document.getElementById('stat-uptime').innerText = Math.floor(d.uptime / 60);
        }
        if (currentView === 'statistics') {
            document.getElementById('stat-reconnects-2').innerText = d.stats.reconnects;
            document.getElementById('stat-msgs-rec-2').innerText = d.stats.msgsReceived;
            document.getElementById('stat-msgs-sent-2').innerText = d.stats.msgsSent;
            document.getElementById('stat-cmds-2').innerText = d.stats.cmdsExecuted;
            
            if (statsChart) {
                statsChart.data.datasets[0].data.shift();
                statsChart.data.datasets[0].data.push(d.memUsage);
                statsChart.data.datasets[1].data.shift();
                statsChart.data.datasets[1].data.push(d.cpuUsage);
                statsChart.update('none');
            }
        }
    }).catch(err => console.error('Status fetch error:', err));
}

// Initialize
fetchStatus();
renderDashboard();