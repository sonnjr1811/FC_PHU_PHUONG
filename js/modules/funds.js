import { fetchFullData } from './api.js';

export async function renderFunds() {
    const viewContainer = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = "Quỹ Đội";

    const data = await fetchFullData();
    const isAdmin = data.isAdmin;
    const f = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

    let tbody = (data.funds.transactions || []).map(t => {
        const isInc = t.type === 'income';
        return `
            <tr>
                <td>${t.date}</td>
                <td style="color:${isInc ? '#2ecc71' : '#e74c3c'}; font-weight:bold;">${isInc ? '+' : '-'}${f.format(t.amount)}</td>
                <td><span class="badge ${isInc ? 'active' : 'inactive'}">${isInc ? 'Thu' : 'Chi'}</span></td>
                <td>${t.description || '-'}</td>
                <td align="center">
                    ${isAdmin ? `<button class="action-btn delete" onclick="window.deleteItem('transaction', ${t.id})"><i class="fa-solid fa-trash"></i></button>` : '-'}
                </td>
            </tr>`;
    }).join('');

    viewContainer.innerHTML = `
        <div class="stat-card glass-panel" style="display:flex; justify-content:space-between; align-items:center; padding:20px; margin-bottom:20px;">
            <div><p>Số dư hiện tại</p><h2>${f.format(data.funds.balance)}</h2></div>
            ${isAdmin ? '<button class="btn-primary" onclick="alert(\'Thêm giao dịch...\')">Thêm Thu/Chi</button>' : ''}
        </div>
        <div class="glass-panel" style="padding:20px;">
            <table class="data-table">
                <thead><tr><th>Ngày</th><th>Số Tiền</th><th>Loại</th><th>Nội Dung</th><th>Thao Tác</th></tr></thead>
                <tbody>${tbody || '<tr><td colspan="5" align="center">Chưa có giao dịch</td></tr>'}</tbody>
            </table>
        </div>
    `;
}