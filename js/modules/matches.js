import { fetchFullData } from './api.js';

export async function renderMatches() {
    const viewContainer = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = "Lịch Thi Đấu";

    const data = await fetchFullData();
    const isAdmin = data.isAdmin;

    let tbody = (data.matches || []).map(m => {
        let resText = 'vs', resStyle = 'background:rgba(255,255,255,0.1); color:#aaa;';
        if (m.result && m.result.includes('-')) {
            const s = m.result.split('-');
            resText = `${s[0]} - ${s[1]}`;
            if (parseInt(s[0]) > parseInt(s[1])) resStyle = 'background:#28a745; color:white;';
            else if (parseInt(s[0]) < parseInt(s[1])) resStyle = 'background:#dc3545; color:white;';
            else resStyle = 'background:#ffc107; color:black;';
        }

        return `
            <tr>
                <td>${m.match_date}</td>
                <td><b>${m.opponent}</b></td>
                <td>${m.location || '-'}</td>
                <td align="center"><span class="badge" style="${resStyle} padding:5px 15px; border-radius:5px;">${resText}</span></td>
                <td align="center">
                    ${isAdmin ? `
                        <button class="action-btn delete" onclick="window.deleteItem('match', ${m.id})"><i class="fa-solid fa-trash"></i></button>
                    ` : '<i class="fa-solid fa-lock" style="opacity:0.2"></i>'}
                </td>
            </tr>`;
    }).join('');

    viewContainer.innerHTML = `
        <div class="glass-panel" style="padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3>Lịch Thi Đấu & Kết Quả</h3>
                ${isAdmin ? '<button class="btn-primary" id="add-match-btn">+ Thêm Trận</button>' : ''}
            </div>
            <table class="data-table">
                <thead><tr><th>Thời Gian</th><th>Đối Thủ</th><th>Địa Điểm</th><th>Kết Quả</th><th>Thao Tác</th></tr></thead>
                <tbody>${tbody || '<tr><td colspan="5" align="center">Chưa có dữ liệu</td></tr>'}</tbody>
            </table>
        </div>
    `;

    // Gắn sự kiện nếu là Admin
    if (isAdmin && document.getElementById('add-match-btn')) {
        document.getElementById('add-match-btn').onclick = () => alert("Tính năng thêm trận đang được cập nhật modal...");
    }
}