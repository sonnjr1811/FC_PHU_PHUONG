// js/modules/players.js
import { fetchFullData } from './api.js';

export async function renderPlayers() {
    const viewContainer = document.getElementById('view-container');
    const data = await fetchFullData();
    const isAdmin = data.isAdmin;

    let tbody = (data.players || []).map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.position || '-'}</td>
            <td>${isAdmin ? `<button class="action-btn delete" onclick="window.deleteItem('player', ${p.id})">Xóa</button>` : ''}</td>
        </tr>`).join('');

    viewContainer.innerHTML = `
        <div class="glass-panel" style="padding:20px;">
            <h3>Đội Hình</h3>
            <table class="data-table">
                <thead><tr><th>Tên</th><th>Vị Trí</th><th>Thao Tác</th></tr></thead>
                <tbody>${tbody}</tbody>
            </table>
        </div>
    `;
}