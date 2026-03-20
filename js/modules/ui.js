// js/modules/ui.js
import { handleLogout } from './api.js';

export function updateAuthUI(isAdmin) {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    if (isAdmin) {
        authArea.innerHTML = `
            <span class="admin-badge" style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px;">Admin</span>
            <button id="logout-btn" class="btn-secondary" style="padding: 5px 12px; font-size: 12px;">Thoát</button>
        `;
        document.getElementById('logout-btn').onclick = handleLogout;
    } else {
        authArea.innerHTML = `
            <button onclick="document.getElementById('login-modal').classList.add('active')" class="btn-primary" style="padding: 6px 15px; font-size: 12px;">Đăng nhập Admin</button>
        `;
    }
}

// Đưa các hàm xóa/sửa ra phạm vi toàn cục để thuộc tính onclick="..." trong HTML chạy được
window.deleteItem = async (type, id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa không?")) return;
    await fetch(`api/delete_${type}.php?id=${id}`);
    location.reload(); 
};