import { fetchFullData } from './api.js';

export async function renderAlbum() {
    const viewContainer = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = "Ảnh Kỉ Niệm";

    const data = await fetchFullData();
    const isAdmin = data.isAdmin;
    const photos = data.album || [];

    let photoHTML = photos.map(p => `
        <div class="photo-card glass-panel" style="position: relative; border-radius: 12px; overflow: hidden;">
            <img src="${p.image_url}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
            <div style="padding: 10px; background: rgba(0,0,0,0.7); color: white;">
                <div style="font-size: 14px; font-weight: bold;">${p.title}</div>
            </div>
            ${isAdmin ? `
                <button class="action-btn delete" onclick="window.deleteItem('photo', ${p.id})" 
                    style="position: absolute; top: 5px; right: 5px; background: rgba(220,53,69,0.8); border-radius: 50%; width: 30px; height: 30px;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            ` : ''}
        </div>
    `).join('');

    viewContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Khoảnh Khắc Đội Bóng</h3>
            ${isAdmin ? `<button class="btn-primary" onclick="alert(\'Tính năng tải ảnh...\')">+ Đăng Ảnh</button>` : ''}
        </div>
        <div class="album-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
            ${photoHTML || '<p>Chưa có ảnh nào.</p>'}
        </div>
    `;
}