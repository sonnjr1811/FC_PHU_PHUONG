import { fetchFullData } from './api.js';

export async function renderSettings() {
    const viewContainer = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    
    if (pageTitle) pageTitle.textContent = "Cài Đặt Hệ Thống";

    // 1. Lấy dữ liệu mới nhất để kiểm tra quyền
    const data = await fetchFullData();

    // 2. Nếu KHÔNG PHẢI ADMIN -> Hiện thông báo khóa thay vì để trống
    if (!data.isAdmin) {
        viewContainer.innerHTML = `
            <div class="glass-panel" style="padding:40px; text-align:center;">
                <i class="fa-solid fa-lock" style="font-size: 4rem; color: #e74c3c; margin-bottom: 20px; display: block;"></i>
                <h3 style="color: #fff;">Truy Cập Bị Từ Chối</h3>
                <p style="color: #aaa;">Vui lòng đăng nhập tài khoản Quản trị viên để sử dụng chức năng này.</p>
                <button onclick="document.getElementById('login-modal').classList.add('active')" class="btn-primary" style="margin-top:20px;">Đăng Nhập Ngay</button>
            </div>
        `;
        return;
    }

    // 3. Nếu LÀ ADMIN -> Vẽ giao diện quản trị
    viewContainer.innerHTML = `
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            
            <div class="glass-panel" style="padding: 20px;">
                <h3><i class="fa-solid fa-user-shield"></i> Đổi Mật Khẩu Admin</h3>
                <form id="change-pass-form" style="margin-top: 15px;">
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display:block; margin-bottom:5px; font-size:14px;">Mật khẩu mới</label>
                        <input type="password" id="my-new-pass" class="form-control" required placeholder="Nhập mật khẩu mới..." style="width:100%;">
                    </div>
                    <button type="submit" class="btn-secondary" style="width:100%;">Cập Nhật Mật Khẩu</button>
                </form>
            </div>

            <div class="glass-panel" style="padding: 20px;">
                <h3><i class="fa-solid fa-user-plus"></i> Tạo Admin Mới</h3>
                <form id="add-admin-form" style="margin-top: 15px;">
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label style="display:block; margin-bottom:5px; font-size:14px;">Tên đăng nhập</label>
                        <input type="text" id="new-admin-user" class="form-control" required placeholder="Ví dụ: thuquy2026" style="width:100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display:block; margin-bottom:5px; font-size:14px;">Mật khẩu</label>
                        <input type="password" id="new-admin-pass" class="form-control" required placeholder="Nhập mật khẩu" style="width:100%;">
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%;">Tạo Tài Khoản</button>
                </form>
            </div>

        </div>
    `;

    // --- GẮN SỰ KIỆN CHO CÁC FORM ---

    // Sự kiện 1: Đổi mật khẩu
    document.getElementById('change-pass-form').onsubmit = async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('my-new-pass').value;
        const res = await fetch('api/change_password.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: newPass })
        });
        const result = await res.json();
        alert(result.message);
        if(result.success) e.target.reset();
    };

    // Sự kiện 2: Thêm Admin mới
    document.getElementById('add-admin-form').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('new-admin-user').value,
            password: document.getElementById('new-admin-pass').value
        };
        const res = await fetch('api/add_admin.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        alert(result.message);
        if(result.success) e.target.reset();
    };
}