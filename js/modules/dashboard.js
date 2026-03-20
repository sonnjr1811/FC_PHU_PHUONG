// js/modules/dashboard.js
import { fetchFullData } from './api.js';

export async function renderDashboard() {
    const viewContainer = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = "Tổng Quan";
    
    const data = await fetchFullData();
    const isAdmin = data.isAdmin;
    const f = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

    const totalPlayers = data.players ? data.players.filter(p => !p.leave_date).length : 0;
    const balance = data.funds ? data.funds.balance : 0;

    viewContainer.innerHTML = `
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div class="stat-card glass-panel" style="padding: 20px; border-left: 5px solid #3498db;">
                <p>Thành Viên</p><h2>${totalPlayers}</h2>
            </div>
            <div class="stat-card glass-panel" style="padding: 20px; border-left: 5px solid #2ecc71;">
                <p>Quỹ Đội</p><h2 style="color: ${balance >= 0 ? '#2ecc71' : '#e74c3c'}">${f.format(balance)}</h2>
            </div>
        </div>
        <div class="glass-panel" style="margin-top:20px; padding:20px;">
            <h3>Bảng Tin Nội Bộ</h3>
            <div id="notice-list">${(data.notices || []).map(n => `<p>${n.content}</p>`).join('')}</div>
        </div>
    `;
}