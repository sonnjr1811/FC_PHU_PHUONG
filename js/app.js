/**
 * FC Phú Phương Management System
 * Front-end Core Script (SPA Architecture)
 */
// Trạng thái đăng nhập toàn cục (Đồng bộ với Session/LocalStorage)
let isLoggedIn = localStorage.getItem('isAdmin') === 'true';

// Lưu trữ dữ liệu lấy từ API để dùng chung cho chức năng sửa/xóa
let currentPlayers = [];
let currentMatches = [];
let currentFunds = [];
let activeLineup = { match_id: null, pitch_type: '7', formation: '2-3-1', positions: [] };
let lineupPlayers = [];

// Khởi chạy ứng dụng khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
    // Khởi tạo theme từ localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Khởi tạo hình nền từ localStorage
    const savedBg = localStorage.getItem('bg_image');
    if (savedBg) {
        setBgImage(savedBg);
    }

    // Đồng bộ session đăng nhập với backend
    await checkAuthSession();

    initNavigation();
    initAuth();
    initAdminForms();
    initEventDelegation();

    // Gắn sự kiện lắng nghe việc chọn file ảnh đại diện để tự động resize và upload
    handleAvatarUpload('player-avatar-file', 'player-avatar');
    handleAvatarUpload('edit-player-avatar-file', 'edit-player-avatar');

    // Mặc định khi vừa tải trang sẽ hiển thị phân hệ Tổng Quan
    switchView('dashboard', 'Tổng Quan');
});

/**
 * Đồng bộ trạng thái đăng nhập với Backend PHP Session
 */
async function checkAuthSession() {
    try {
        const response = await fetch('api/check_login.php');
        if (response.ok) {
            const data = await response.json();
            if (data.logged_in) {
                localStorage.setItem('isAdmin', 'true');
                isLoggedIn = true;
            } else {
                localStorage.setItem('isAdmin', 'false');
                isLoggedIn = false;
            }
        } else {
            localStorage.setItem('isAdmin', 'false');
            isLoggedIn = false;
        }
    } catch (error) {
        console.error('Không thể kiểm tra session đăng nhập:', error);
        localStorage.setItem('isAdmin', 'false');
        isLoggedIn = false;
    }
}

/**
 * 1. XỬ LÝ ĐIỀU HƯỚNG SIDEBAR (SPA ROUTING)
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('#main-nav a[data-view]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Xóa trạng thái active của tất cả các menu
            navLinks.forEach(item => item.classList.remove('active'));

            // Kích hoạt trạng thái active cho menu vừa click
            link.classList.add('active');

            // Lấy view định hướng và tiêu đề tương ứng
            const viewName = link.getAttribute('data-view');
            const viewTitle = link.textContent.trim();

            // Gọi hàm render nội dung tương ứng
            switchView(viewName, viewTitle);
        });
    });
}

/**
 * 2. ĐIỀU PHỐI VÀ RENDER NỘI DUNG PHÂN HỆ (VIEW ROUTER)
 */
function switchView(viewName, title, param = null) {
    const container = document.getElementById('view-container');
    const titleElement = document.getElementById('page-title');

    // Đổi tiêu đề trên Topbar
    if (titleElement) titleElement.textContent = title;

    // Hiển thị trạng thái đang tải (Loading) giúp UX mượt mà hơn
    if (container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; min-height:200px; color:var(--text-secondary);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-right:10px;"></i> Đang tải dữ liệu...
            </div>
        `;
    }

    // Gửi request Fetch API tới Backend PHP dựa theo view được chọn
    switch (viewName) {
        case 'dashboard':
            fetchData('api/api.php?action=get_dashboard', renderDashboard);
            break;
        case 'players':
            fetchData('api/api.php?action=get_players', renderPlayers);
            break;
        case 'matches':
            fetchData('api/api.php?action=get_matches', renderMatches);
            break;
        case 'funds':
            fetchData('api/api.php?action=get_funds', renderFunds);
            break;
        case 'album':
            fetchData('api/api.php?action=get_album', renderAlbum);
            break;
        case 'settings':
            fetchData('api/api.php?action=get_backgrounds', renderSettings);
            break;
        case 'lineup':
            if (param) {
                fetchData(`api/api.php?action=get_match_lineup_data&match_id=${param}`, (data) => renderLineup(param, data));
            } else {
                if (container) container.innerHTML = `<h3>ID trận đấu không hợp lệ!</h3>`;
            }
            break;
        default:
            if (container) container.innerHTML = `<h3>Chức năng này đang được phát triển</h3>`;
            break;
    }
}

// Hàm gọi API dùng chung
function fetchData(url, callback) {
    const container = document.getElementById('view-container');
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Mạng hoặc Server gặp lỗi');
            return response.json();
        })
        .then(data => callback(data))
        .catch(error => {
            console.error('Error fetching data:', error);
            if (container) {
                container.innerHTML = `
                    <div class="glass-panel" style="padding:20px; color:var(--danger-color); text-align:center;">
                        <i class="fa-solid fa-circle-exclamation" style="font-size:2rem; margin-bottom:10px;"></i>
                        <p>Không thể kết nối với máy chủ database. Vui lòng kiểm tra lại PHP/XAMPP.</p>
                    </div>
                `;
            }
        });
}

// Render: Tổng Quan (Dashboard)
function renderDashboard(data) {
    const container = document.getElementById('view-container');

    container.innerHTML = `
        <div class="dashboard-layout">
            <!-- Row 1: Trận Tiếp Theo (To ở trên) -->
            <div class="glass-panel stat-card next-match-card">
                <div class="stat-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="fa-regular fa-calendar-check" style="color: var(--accent-primary); margin-right: 6px;"></i> Trận Đấu Tiếp Theo
                        </h3>
                        <div class="stat-icon secondary" style="width: 40px; height: 40px; font-size: 1.2rem; margin: 0;">
                            <i class="fa-solid fa-calendar-days"></i>
                        </div>
                    </div>
                    ${data.next_match ? `
                        <div class="next-match-content">
                            <div class="match-teams">
                                <span class="team-name home">FC Phú Phương</span>
                                <span class="vs-badge">VS</span>
                                <span class="team-name away">${data.next_match.opponent}</span>
                            </div>
                            <div class="match-details">
                                <div class="match-time">
                                    <i class="fa-regular fa-clock"></i> ${data.next_match.date}
                                </div>
                                <div class="match-stadium">
                                    <i class="fa-solid fa-location-dot"></i> ${data.next_match.stadium}
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="margin-top: 10px;">
                            <div class="value" style="font-size: 1.8rem; font-weight: 700; color: var(--text-muted);">Nghỉ Ngơi</div>
                            <small style="color: var(--text-muted); display: block; margin-top: 5px; font-size: 0.9rem;">Chưa có lịch thi đấu mới</small>
                        </div>
                    `}
                </div>
            </div>

            <!-- Row 2: Hai cái còn lại nằm dưới -->
            <div class="dashboard-grid-bottom">
                <!-- Card 2: Quỹ Đội -->
                <div class="glass-panel stat-card">
                    <div class="stat-info">
                        <h3>Quỹ Đội Hiện Tại</h3>
                        <div class="value" style="font-size: 2.2rem; font-weight: 800; color: #10b981; margin-top: 5px;">${data.current_funds}</div>
                        <small style="color: var(--text-secondary); display: block; margin-top: 5px; font-size: 0.85rem;"><i class="fa-solid fa-clock-rotate-left" style="margin-right: 4px; color: var(--accent-primary);"></i> Cập nhật: ${data.funds_last_update}</small>
                    </div>
                    <div class="stat-icon primary" style="margin-left: 15px; flex-shrink: 0;">
                        <i class="fa-solid fa-sack-dollar"></i>
                    </div>
                </div>

                <!-- Card 3: Cầu Thủ -->
                <div class="glass-panel stat-card">
                    <div class="stat-info">
                        <h3>Tổng Thành Viên</h3>
                        <div class="value" style="font-size: 2.2rem; font-weight: 800; color: #a855f7; margin-top: 5px;">
                            ${data.total_players} <span style="font-size: 1.1rem; font-weight: 500; color: var(--text-secondary);">Cầu thủ</span>
                        </div>
                        <small style="color: var(--text-secondary); display: block; margin-top: 5px; font-size: 0.85rem;">Đang hoạt động</small>
                    </div>
                    <div class="stat-icon warning" style="margin-left: 15px; flex-shrink: 0;">
                        <i class="fa-solid fa-users"></i>
                    </div>
                </div>
            </div>

            <!-- Row 3: Widget Phong Độ Cầu Thủ -->
            <div class="glass-panel performance-widget" style="margin-top: 20px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); font-family: 'Outfit';">
                        <i class="fa-solid fa-ranking-star" style="color: var(--accent-primary); margin-right: 6px;"></i> Bảng Xếp Hạng Phong Độ
                    </h3>
                    <!-- Các tab chuyển đổi -->
                    <div class="perf-tabs" style="display: flex; gap: 6px; background: rgba(0,0,0,0.2); padding: 3px; border-radius: 6px;">
                        <button class="perf-tab-btn active" data-tab="scorers" style="background: none; border: none; padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; color: var(--text-secondary); cursor: pointer; font-weight: 600; transition: all 0.2s;">Ghi bàn</button>
                        <button class="perf-tab-btn" data-tab="assisters" style="background: none; border: none; padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; color: var(--text-secondary); cursor: pointer; font-weight: 600; transition: all 0.2s;">Kiến tạo</button>
                        <button class="perf-tab-btn" data-tab="ratings" style="background: none; border: none; padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; color: var(--text-secondary); cursor: pointer; font-weight: 600; transition: all 0.2s;">Điểm số</button>
                    </div>
                </div>

                <!-- Tab: Ghi Bàn -->
                <div class="perf-tab-content active" id="tab-scorers">
                    ${renderPerfList(data.top_scorers, 'goals')}
                </div>

                <!-- Tab: Kiến Tạo -->
                <div class="perf-tab-content" id="tab-assisters" style="display: none;">
                    ${renderPerfList(data.top_assisters, 'assists')}
                </div>

                <!-- Tab: Điểm Số -->
                <div class="perf-tab-content" id="tab-ratings" style="display: none;">
                    ${renderPerfList(data.top_ratings, 'rating')}
                </div>
            </div>
        </div>
    `;

    // Gắn sự kiện chuyển tab cho widget phong độ
    setTimeout(() => {
        const tabBtns = document.querySelectorAll('.perf-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Xóa active
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'none';
                    b.style.color = 'var(--text-secondary)';
                });

                // Active button hiện tại
                btn.classList.add('active');
                btn.style.background = 'var(--accent-primary)';
                btn.style.color = '#fff';

                // Ẩn tất cả nội dung tab
                const contents = document.querySelectorAll('.perf-tab-content');
                contents.forEach(c => c.style.display = 'none');

                // Hiện nội dung tab tương ứng
                const tabName = btn.getAttribute('data-tab');
                const targetContent = document.getElementById(`tab-${tabName}`);
                if (targetContent) targetContent.style.display = 'block';
            });
        });

        // Kích hoạt tab active ban đầu
        const activeBtn = document.querySelector('.perf-tab-btn.active');
        if (activeBtn) {
            activeBtn.style.background = 'var(--accent-primary)';
            activeBtn.style.color = '#fff';
        }
    }, 0);
}

/**
 * Hàm phụ trợ render danh sách phong độ
 */
function renderPerfList(list, type) {
    if (!list || list.length === 0) {
        return `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px 0; margin: 0;">Chưa có dữ liệu thống kê phong độ.</p>`;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    list.forEach((item, index) => {
        let valDisplay = '';
        let badgeColor = '';
        if (type === 'goals') {
            valDisplay = `<strong>${item.total_goals}</strong> bàn`;
            badgeColor = 'background: rgba(16, 185, 129, 0.15); color: #10b981;';
        } else if (type === 'assists') {
            valDisplay = `<strong>${item.total_assists}</strong> kiến tạo`;
            badgeColor = 'background: rgba(59, 130, 246, 0.15); color: #3b82f6;';
        } else if (type === 'rating') {
            valDisplay = `Rating: <strong>${item.avg_rating}</strong>`;
            badgeColor = 'background: rgba(245, 158, 11, 0.15); color: #f59e0b;';
        }

        // Tạo badge thứ hạng 1, 2, 3
        let rankBadge = `<span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); width: 24px; text-align: center;">${index + 1}</span>`;
        if (index === 0) rankBadge = `<span style="font-size: 1.1rem; color: #fbbf24; width: 24px; text-align: center; display: inline-block;"><i class="fa-solid fa-trophy"></i></span>`;
        else if (index === 1) rankBadge = `<span style="font-size: 1.1rem; color: #cbd5e1; width: 24px; text-align: center; display: inline-block;"><i class="fa-solid fa-medal"></i></span>`;
        else if (index === 2) rankBadge = `<span style="font-size: 1.1rem; color: #b45309; width: 24px; text-align: center; display: inline-block;"><i class="fa-solid fa-medal"></i></span>`;

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='none'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${rankBadge}
                    <img src="${item.avatar_url || 'https://via.placeholder.com/32'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);" />
                    <span style="font-weight: 600; font-size: 0.9rem;">${item.name}</span>
                </div>
                <span style="font-size: 0.8rem; padding: 4px 10px; border-radius: 6px; ${badgeColor} font-weight: 500;">
                    ${valDisplay}
                </span>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

// Chuyển chuỗi tiếng Việt có dấu thành không dấu để hỗ trợ tìm kiếm không dấu linh hoạt
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|B|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Loại bỏ các dấu phụ khác
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return str.toLowerCase().trim();
}

// Render các hàng cầu thủ cho table body
function renderPlayerRows(playersList) {
    let rows = '';
    if (playersList.length === 0) {
        rows = `<tr><td colspan="${isLoggedIn ? 6 : 5}" style="text-align:center; color:var(--text-secondary); padding:20px;">Không tìm thấy cầu thủ phù hợp</td></tr>`;
    } else {
        playersList.forEach(p => {
            const status = p.status || 'Active';
            const statusClass = status.toLowerCase() === 'active' ? 'text-success' : 'text-danger';
            const statusText = status.toLowerCase() === 'active' ? 'Hoạt động' : 'Chấn thương';

            const actionCol = isLoggedIn ? `
                <td style="text-align:center;">
                    <button class="action-btn edit edit-player-trigger" data-id="${p.id}" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete delete-player-trigger" data-id="${p.id}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </td>
            ` : '';

            rows += `
                <tr style="border-top:1px solid rgba(255,255,255,0.05); height:50px;">
                    <td style="font-weight:700; color:var(--accent-color); text-align:center;">#${p.shirt_number || '0'}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${p.avatar_url || 'https://via.placeholder.com/32'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;"/>
                            <strong>${p.name}</strong>
                        </div>
                    </td>
                    <td>${p.position || 'Chưa rõ'}</td>
                    <td>${p.phone || '---'}</td>
                    <td><span class="${statusClass}">● ${statusText}</span></td>
                    ${actionCol}
                </tr>
            `;
        });
    }
    return rows;
}

// Render: Đội hình (Players)
function renderPlayers(players) {
    currentPlayers = players; // Lưu mảng toàn cục
    const container = document.getElementById('view-container');

    container.innerHTML = `
        <div class="glass-panel" style="padding:24px; overflow-x:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:15px;">
                <h3 style="font-family:'Outfit'; margin:0;">Danh Sách Đội Hình</h3>
                <div style="display:flex; gap:10px; align-items:center; flex-grow:1; max-width:400px; margin-left:20px;">
                    <div style="position:relative; width:100%;">
                        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.9rem;"></i>
                        <input type="text" id="player-search-input" class="form-control" placeholder="Tìm kiếm cầu thủ..." style="padding-left:35px; height:38px; font-size:0.9rem; margin-bottom:0;">
                    </div>
                </div>
                ${isLoggedIn ? `<button class="btn-primary" id="add-player-btn" style="font-size:0.85rem; height:38px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-user-plus"></i> Thêm Cầu Thủ</button>` : ''}
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:80px; text-align:center;">Số Áo</th>
                        <th>Họ Và Tên</th>
                        <th>Vị Trí</th>
                        <th>Số Điện Thoại</th>
                        <th>Trạng Thái</th>
                        ${isLoggedIn ? '<th style="width:100px; text-align:center;">Hành động</th>' : ''}
                    </tr>
                </thead>
                <tbody id="player-table-body">${renderPlayerRows(players)}</tbody>
            </table>
        </div>
    `;

    // Lắng nghe sự kiện tìm kiếm thời gian thực (real-time)
    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query === '') {
                document.getElementById('player-table-body').innerHTML = renderPlayerRows(players);
                return;
            }

            // Tách từ khóa tìm kiếm thành mảng không dấu
            const searchWords = removeVietnameseTones(query).split(/\s+/);

            const filtered = players.filter(p => {
                const statusText = (p.status || 'Active').toLowerCase() === 'active' ? 'hoạt động active' : 'chấn thương injured';
                const shirtStr = p.shirt_number !== null ? `#${p.shirt_number}` : '';

                // Chuỗi thông tin tổng hợp của cầu thủ để so khớp
                const combinedInfo = removeVietnameseTones(
                    `${p.name} ${p.position || ''} ${shirtStr} ${p.phone || ''} ${statusText}`
                );

                // Kiểm tra xem tất cả các từ tìm kiếm có xuất hiện trong combinedInfo hay không
                return searchWords.every(word => combinedInfo.includes(word));
            });

            document.getElementById('player-table-body').innerHTML = renderPlayerRows(filtered);
        });
    }
}

// Render: Lịch Thi Đấu (Matches)
function renderMatches(matches) {
    currentMatches = matches; // Lưu mảng toàn cục
    const container = document.getElementById('view-container');
    let content = `
        <div class="glass-panel" style="padding:20px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-family:'Outfit';">Lịch Thi Đấu & Kết Quả</h3>
                ${isLoggedIn ? '<button class="btn-primary" id="add-match-btn" style="font-size:0.85rem;"><i class="fa-solid fa-calendar-plus"></i> Thêm Trận</button>' : ''}
            </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr; gap:16px;">
    `;

    if (matches.length === 0) {
        content += `<div class="glass-panel" style="padding:20px; text-align:center; color:var(--text-secondary);">Chưa cấu hình lịch thi đấu.</div>`;
    } else {
        matches.forEach(m => {
            const status = m.status || 'Upcoming';
            const isFinished = status.toLowerCase() === 'finished';
            const isPostponed = status.toLowerCase() === 'postponed';

            // So sánh thời gian trận đấu với hiện tại
            let isPast = false;
            if (m.match_date) {
                const parts = m.match_date.split(' - ');
                if (parts.length === 2) {
                    const time = parts[0]; // "19:00"
                    const dateParts = parts[1].split('/'); // ["06", "08", "2026"]
                    if (dateParts.length === 3) {
                        const jsDateStr = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T${time}`;
                        const jsDate = new Date(jsDateStr);
                        isPast = jsDate < new Date();
                    }
                }
            }

            let statusLabel = '';
            let statusColor = '';
            let scoreDisplay = 'VS';

            if (isFinished) {
                statusLabel = 'Đã kết thúc';
                statusColor = '#10b981'; // Xanh lá
                scoreDisplay = (m.our_score !== null && m.opp_score !== null) ? `${m.our_score} - ${m.opp_score}` : 'Chờ cập nhật';
            } else if (isPostponed) {
                statusLabel = 'Đã hoãn';
                statusColor = 'var(--danger-color)'; // Đỏ (danger)
                scoreDisplay = 'Hoãn';
            } else {
                if (isPast) {
                    statusLabel = 'Chờ cập nhật tỉ số';
                    statusColor = '#f59e0b'; // Cam (warning)
                    scoreDisplay = '? - ?';
                } else {
                    statusLabel = 'Sắp diễn ra';
                    statusColor = '#3b82f6'; // Xanh dương
                    scoreDisplay = 'VS';
                }
            }

            // Thêm các nút hành động admin
            const adminActions = isLoggedIn ? `
                <div style="margin-left: 15px; display:flex; gap:8px;">
                    <button class="action-btn edit edit-match-trigger" data-id="${m.id}" title="Cập nhật kết quả/thông tin"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete delete-match-trigger" data-id="${m.id}" title="Xóa trận đấu"><i class="fa-solid fa-trash"></i></button>
                </div>
            ` : '';

            content += `
                <div class="glass-panel" style="padding:20px; display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:150px;">
                        <span style="font-size:0.8rem; background:rgba(255,255,255,0.08); padding:4px 8px; border-radius:4px; color:var(--text-secondary);">
                            <i class="fa-regular fa-calendar"></i> ${m.match_date}
                        </span>
                        <h4 style="margin-top:10px; font-size:1.1rem;"><i class="fa-solid fa-location-dot" style="color:var(--danger-color)"></i> Sân: ${m.stadium}</h4>
                        ${isPostponed ? `
                            <small style="display:block; margin-top:5px; color:var(--danger-color); font-weight:600;"><i class="fa-solid fa-circle-exclamation"></i> Lý do hoãn: ${m.note || 'Chưa rõ lý do'}</small>
                        ` : `
                            ${m.note ? `<small style="display:block; margin-top:5px; color:var(--accent-warning);"><i class="fa-solid fa-circle-info"></i> Ghi chú: ${m.note}</small>` : ''}
                        `}
                        <div style="margin-top:12px;">
                            <button class="btn-primary lineup-trigger-btn" data-id="${m.id}" style="font-size:0.75rem; padding:6px 12px; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-chalkboard-user"></i> Sa Bàn & Điểm Danh
                            </button>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:24px; flex:2; justify-content:center; min-width:280px;">
                        <div style="text-align:right; flex:1;"><strong>FC Phú Phương</strong></div>
                        <div style="background:rgba(59, 130, 246, 0.2); padding:8px 20px; border-radius:8px; font-weight:800; font-size:1.2rem; color:var(--accent-color); min-width:70px; text-align:center;">
                            ${scoreDisplay}
                        </div>
                        <div style="text-align:left; flex:1;"><strong>${m.opponent}</strong></div>
                    </div>
                    <div style="flex:1; text-align:right; min-width:150px; display:flex; align-items:center; justify-content:flex-end;">
                        <span style="font-size:0.85rem; font-weight:600; color:${statusColor}">
                            ${statusLabel}
                        </span>
                        ${adminActions}
                    </div>
                </div>
            `;
        });
    }
    content += '</div>';
    container.innerHTML = content;
}

// Render: Quỹ Đội (Funds)
function renderFunds(funds) {
    currentFunds = funds; // Lưu mảng toàn cục
    const container = document.getElementById('view-container');
    let rows = '';
    let balance = 0;

    if (funds.length === 0) {
        rows = `<tr><td colspan="${isLoggedIn ? 5 : 4}" style="text-align:center; color:var(--text-secondary); padding:20px;">Chưa có lịch sử giao dịch quỹ</td></tr>`;
    } else {
        funds.forEach(f => {
            const type = f.type || 'chi';
            const isThu = type.toLowerCase() === 'thu' || type.toLowerCase() === 'income';
            const typeSign = isThu ? '+' : '-';
            const typeColor = isThu ? '#10b981' : 'var(--danger-color)';

            const amount = parseInt(f.amount) || 0;
            if (isThu) {
                balance += amount;
            } else {
                balance -= amount;
            }

            // Thêm cột hành động sửa/xóa cho admin
            const actionCol = isLoggedIn ? `
                <td style="text-align:center;">
                    <button class="action-btn edit edit-fund-trigger" data-id="${f.id}" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete delete-fund-trigger" data-id="${f.id}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </td>
            ` : '';

            rows += `
                <tr style="border-top:1px solid rgba(255,255,255,0.05); height:45px;">
                    <td><small style="color:var(--text-secondary)">${f.date}</small></td>
                    <td><strong>${f.description}</strong></td>
                    <td><small style="color:var(--text-secondary)">${f.player_name || 'Quỹ chung'}</small></td>
                    <td style="font-weight:700; color:${typeColor}; text-align:right;">${typeSign}${amount.toLocaleString()}đ</td>
                    ${actionCol}
                </tr>
            `;
        });
    }

    container.innerHTML = `
        <!-- Thẻ thống kê số dư quỹ -->
        <div class="stat-card glass-panel" style="display:flex; justify-content:space-between; align-items:center; padding:20px; margin-bottom:20px;">
            <div>
                <p style="color:var(--text-secondary); font-size:0.9rem;">Số dư quỹ hiện tại</p>
                <h2 style="font-size:2rem; font-weight:800; color:#10b981; margin-top:5px;">${balance.toLocaleString()}đ</h2>
            </div>
            ${isLoggedIn ? '<button class="btn-primary" id="add-fund-btn" style="font-size:0.85rem;"><i class="fa-solid fa-plus"></i> Thêm Thu/Chi</button>' : ''}
        </div>

        <div class="glass-panel" style="padding:24px;">
            <h3 style="font-family:'Outfit'; margin-bottom:20px;">Nhật Ký Thu Chi Quỹ Đội</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:120px;">Ngày</th>
                        <th>Nội Dung</th>
                        <th>Người Thực Hiện</th>
                        <th style="text-align:right;">Số Tiền</th>
                        ${isLoggedIn ? '<th style="width:100px; text-align:center;">Hành động</th>' : ''}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// Render: Ảnh Kỉ Niệm (Album)
function renderAlbum(images) {
    const container = document.getElementById('view-container');
    let gridItems = '';

    if (images.length === 0) {
        gridItems = `<p style="color:var(--text-secondary); text-align:center; grid-column: 1/-1; padding:40px;">Kho lưu trữ trống.</p>`;
    } else {
        images.forEach(img => {
            const deleteBtn = isLoggedIn ? `
                <button class="action-btn delete delete-photo-trigger" data-id="${img.id}" title="Xóa ảnh" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.85); color: #fff; padding: 6px 10px; border-radius: 6px; backdrop-filter: blur(4px); z-index: 2;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            ` : '';

            gridItems += `
                <div class="glass-panel" style="overflow:hidden; border-radius:12px; position:relative; group;">
                    <img src="${img.url}" style="width:100%; height:260px; object-fit:cover; display:block; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"/>
                    ${deleteBtn}
                    <div style="padding:12px;">
                        <p style="font-size:0.95rem; font-weight:600; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${img.title}</p>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="glass-panel" style="padding:20px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-family:'Outfit'; margin:0;"><i class="fa-solid fa-images" style="color:var(--accent-primary); margin-right: 8px;"></i> Ảnh Kỉ Niệm Đội Bóng</h3>
            ${isLoggedIn ? '<button class="btn-primary" id="add-photo-btn" style="font-size:0.85rem;"><i class="fa-solid fa-image"></i> Thêm Ảnh</button>' : ''}
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
            ${gridItems}
        </div>
    `;
}

// Render: Cài Đặt (Settings)
function renderSettings(customBgs = []) {
    const container = document.getElementById('view-container');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const savedBg = localStorage.getItem('bg_image');

    // Tạo HTML cho danh sách tất cả hình nền (cả mẫu lẫn tải lên) từ DB
    let bgItems = '';
    
    // Luôn có option Mặc Định đầu tiên
    const isDefaultSelected = !savedBg || savedBg === 'default';
    bgItems += `
        <div class="bg-option" data-bg="default" style="cursor: pointer; border-radius: 8px; overflow: hidden; border: 2px solid ${isDefaultSelected ? 'var(--accent-primary)' : 'rgba(128,128,128,0.2)'}; height: 70px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); font-size: 0.85rem; font-weight: 600; text-align: center; padding: 5px;">
            Mặc Định
        </div>
    `;

    if (customBgs && customBgs.length > 0) {
        customBgs.forEach(bg => {
            const isSelected = savedBg === bg.image_url;
            
            // Nếu có label thì render nhãn chữ ở góc dưới
            const labelSpan = bg.label ? `
                <span style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.75rem; text-align: center; padding: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bg.label}</span>
            ` : '';

            // Chỉ hiển thị nút xóa khi đăng nhập admin (isLoggedIn === true)
            const deleteBtn = isLoggedIn ? `
                <button class="delete-bg-btn" data-id="${bg.id}" title="Xóa hình nền này" style="position: absolute; top: 3px; right: 3px; background: rgba(239, 68, 68, 0.85); color: #fff; border: none; border-radius: 4px; padding: 2px 5px; font-size: 0.65rem; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            ` : '';

            bgItems += `
                <div class="bg-option" data-bg="${bg.image_url}" style="cursor: pointer; border-radius: 8px; overflow: hidden; border: 2px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(128,128,128,0.2)'}; height: 70px; background-image: url('${bg.image_url}'); background-size: cover; background-position: center; position: relative;">
                    ${labelSpan}
                    ${deleteBtn}
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="glass-panel" style="padding:24px; max-width:600px;">
            <h3 style="font-family:'Outfit'; margin-bottom:20px;">Cài Đặt Hệ Thống</h3>
            <div style="margin-bottom:20px;">
                <label style="display:block; margin-bottom:8px; font-weight:600;">Giao Diện Hệ Thống</label>
                <button id="theme-dark-btn" class="btn-secondary ${currentTheme === 'dark' ? 'active-theme-btn' : ''}" style="padding: 10px 16px;">
                    <i class="fa-solid fa-moon"></i> Chế độ Tối (Dark Theme)
                </button>
                <button id="theme-light-btn" class="btn-secondary ${currentTheme === 'light' ? 'active-theme-btn' : ''}" style="margin-left:10px; padding: 10px 16px;">
                    <i class="fa-regular fa-sun"></i> Chế độ Sáng (Light Theme)
                </button>
            </div>
            
            <hr style="border-color:rgba(255,255,255,0.05); margin:24px 0;" class="settings-divider"/>
            
            <div style="margin-bottom:20px;">
                <label style="display:block; margin-bottom:12px; font-weight:600;">Hình Nền Hệ Thống</label>
                <div class="bg-selector-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 20px;">
                    ${bgItems}
                </div>
                
                <!-- Nhập URL hình nền tùy chỉnh -->
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <input type="text" id="custom-bg-input" class="form-control" placeholder="Nhập URL hình nền tùy chỉnh..." value="${savedBg && savedBg !== 'default' && !customBgs.some(b => b.image_url === savedBg) ? savedBg : ''}" style="font-size:0.9rem; padding: 6px 10px;">
                    <button id="apply-custom-bg-btn" class="btn-primary" style="font-size:0.85rem; padding: 6px 14px; white-space: nowrap;">Áp Dụng</button>
                </div>

                <!-- Tải ảnh lên từ máy -->
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label class="btn-secondary" style="font-size: 0.85rem; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0;">
                        <i class="fa-solid fa-upload"></i> Tải ảnh từ máy...
                        <input type="file" id="upload-bg-file" accept="image/*" style="display: none;">
                    </label>
                    <span id="upload-bg-status" style="font-size: 0.85rem; color: var(--text-secondary);">Chưa chọn file</span>
                </div>
            </div>

            <hr style="border-color:rgba(255,255,255,0.05); margin:24px 0;" class="settings-divider"/>
            <div>
                <label style="display:block; margin-bottom:8px; font-weight:600;">Thông Tin Đội Bóng</label>
                <p style="font-size:0.9rem; color:var(--text-secondary);">Tên Đội: <strong>FC Phú Phương</strong></p>
                <p style="font-size:0.9rem; color:var(--text-secondary); margin-top:5px;">Trạng thái hệ thống: <span style="color:#10b981;">● Hoạt động ổn định</span></p>
            </div>
        </div>
    `;

    document.getElementById('theme-dark-btn').addEventListener('click', () => {
        setTheme('dark');
        switchView('settings', 'Cài Đặt');
    });
    document.getElementById('theme-light-btn').addEventListener('click', () => {
        setTheme('light');
        switchView('settings', 'Cài Đặt');
    });

    // Sử dụng event delegation cho việc click chọn và xóa hình nền trên container
    container.addEventListener('click', (e) => {
        // 1. Xử lý click nút xóa hình nền
        const deleteBtn = e.target.closest('.delete-bg-btn');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = deleteBtn.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa hình nền này không?')) {
                const bgOpt = deleteBtn.closest('.bg-option');
                const bgUrl = bgOpt.getAttribute('data-bg');
                if (localStorage.getItem('bg_image') === bgUrl) {
                    setBgImage('default');
                }

                fetch(`api/delete_background.php?id=${id}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
                        return res.json();
                    })
                    .then(data => {
                        if (data.success) {
                            alert('Xóa ảnh nền thành công!');
                            switchView('settings', 'Cài Đặt');
                        } else {
                            alert(data.message || 'Lỗi khi xóa ảnh nền');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert('Lỗi: ' + err.message);
                    });
            }
            return;
        }

        // 2. Xử lý click chọn hình nền
        const bgOpt = e.target.closest('.bg-option');
        if (bgOpt) {
            e.preventDefault();
            const bgVal = bgOpt.getAttribute('data-bg');
            setBgImage(bgVal);
            switchView('settings', 'Cài Đặt');
            return;
        }
    });

    // Gắn sự kiện áp dụng ảnh nền tự chọn
    document.getElementById('apply-custom-bg-btn').addEventListener('click', () => {
        const customUrl = document.getElementById('custom-bg-input').value.trim();
        if (customUrl) {
            setBgImage(customUrl);
            alert('Đã áp dụng hình nền tùy chỉnh!');
            switchView('settings', 'Cài Đặt');
        } else {
            setBgImage('default');
            alert('Đã khôi phục về hình nền mặc định!');
            switchView('settings', 'Cài Đặt');
        }
    });

    // Gắn sự kiện tải ảnh nền từ máy lên
    const uploadBgFile = document.getElementById('upload-bg-file');
    if (uploadBgFile) {
        uploadBgFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const status = document.getElementById('upload-bg-status');
            status.textContent = 'Đang tải...';

            const formData = new FormData();
            formData.append('background', file);

            fetch('api/upload_background.php', {
                method: 'POST',
                body: formData
            })
                .then(res => {
                    if (!res.ok) throw new Error('Không thể tải ảnh lên');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        setBgImage(data.url);
                        status.textContent = 'Thành công!';
                        alert('Đã tải lên và áp dụng hình nền thành công!');
                        switchView('settings', 'Cài Đặt');
                    } else {
                        status.textContent = 'Lỗi!';
                        alert(data.message || 'Lỗi tải ảnh lên máy chủ');
                    }
                })
                .catch(err => {
                    console.error(err);
                    status.textContent = 'Lỗi!';
                    alert('Lỗi kết nối máy chủ: ' + err.message);
                });
        });
    }
}

/**
 * 4. QUẢN LÝ AUTHENTICATION (ĐĂNG NHẬP / ĐĂNG XUẤT)
 */
function initAuth() {
    const authArea = document.getElementById('auth-area');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form-submit');

    // Hàm dựng giao diện nút Login/Logout ở góc phải trên cùng màn hình
    function renderAuthButton() {
        if (isLoggedIn) {
            authArea.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.9rem; color:var(--text-secondary); font-weight:600;">
                        <i class="fa-solid fa-user-shield" style="color:var(--accent-color)"></i> Ban Quản Trị
                    </span>
                    <button id="logout-btn" class="btn-secondary" style="padding: 6px 14px; font-size:0.85rem; border-color:var(--danger-color); color:var(--danger-color);">
                        Đăng xuất
                    </button>
                </div>
            `;

            // Xử lý sự kiện đăng xuất
            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.setItem('isAdmin', 'false');
                isLoggedIn = false;
                renderAuthButton();
                // Tải lại view hiện tại để ẩn các nút chức năng ẩn của Admin nếu có
                const activeLink = document.querySelector('#main-nav a.active');
                if (activeLink) activeLink.click();
            });
        } else {
            authArea.innerHTML = `
                <button id="login-trigger-btn" class="btn-primary" style="padding: 8px 18px; font-size:0.9rem; font-weight:600;">
                    <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập
                </button>
            `;

            // Bấm nút hiển thị Modal Đăng nhập
            document.getElementById('login-trigger-btn').addEventListener('click', () => {
                loginModal.classList.add('active');
            });
        }
    }

    // Gắn sự kiện submit cho form đăng nhập
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value.trim();

            fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi kết nối máy chủ');
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        localStorage.setItem('isAdmin', 'true');
                        isLoggedIn = true;
                        loginModal.classList.remove('active');
                        loginForm.reset();
                        renderAuthButton();
                        // Tải lại view hiện tại để cập nhật giao diện Admin
                        const activeLink = document.querySelector('#main-nav a.active');
                        if (activeLink) activeLink.click();
                    } else {
                        alert(data.message || 'Tài khoản hoặc mật khẩu không chính xác');
                    }
                })
                .catch(error => {
                    console.error('Error during login:', error);
                    alert('Đăng nhập thất bại: ' + error.message);
                });
        });
    }

    renderAuthButton();
}

/**
 * 5. KHỞI TẠO VÀ XỬ LÝ SUBMIT CÁC FORM QUẢN TRỊ (ADMIN ACTIONS)
 */
function initAdminForms() {
    // 1. Submit Player
    const playerForm = document.getElementById('player-form-submit');
    if (playerForm) {
        playerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('player-name').value.trim();
            if (!name) {
                alert('Họ và tên cầu thủ không được để trống.');
                showToast('Họ và tên cầu thủ không được để trống.', 'error');
                return;
            }

            const phone = document.getElementById('player-phone').value.trim();

            // Validate số điện thoại Việt Nam
            if (phone !== '' && !/^0\d{9}$/.test(phone)) {
                alert('Số điện thoại sai định dạng.');
                showToast('Số điện thoại sai định dạng.', 'error');
                return;
            }

            // Validate số áo (từ 1 đến 99)
            const shirtVal = document.getElementById('player-shirt').value;
            if (shirtVal !== '') {
                const shirtNum = parseInt(shirtVal);
                if (isNaN(shirtNum) || shirtNum < 1 || shirtNum > 99) {
                    alert('Số áo sai định dạng.');
                    showToast('Số áo sai định dạng.', 'error');
                    return;
                }
            }

            const payload = {
                name: name,
                shirt_number: parseInt(document.getElementById('player-shirt').value) || null,
                position: document.getElementById('player-position').value,
                phone: phone,
                avatar_url: document.getElementById('player-avatar').value.trim(),
                join_date: document.getElementById('player-joindate').value || new Date().toISOString().substring(0, 10),
                status: document.getElementById('player-status').value
            };

            fetch('api/add_player.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(async res => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || data.error || 'Không thể thêm cầu thủ');
                    }
                    return data;
                })
                .then(data => {
                    if (data.success) {
                        alert('Thêm cầu thủ thành công!');
                        showToast('Thêm cầu thủ thành công!', 'success');
                        document.getElementById('player-modal').classList.remove('active');
                        playerForm.reset();
                        switchView('players', 'Đội Hình');
                    } else {
                        alert(data.message || 'Lỗi thêm cầu thủ');
                        showToast(data.message || 'Lỗi thêm cầu thủ', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi: ' + err.message);
                    showToast('Lỗi: ' + err.message, 'error');
                });
        });
    }

    // 2. Submit Edit Player
    const editPlayerForm = document.getElementById('edit-player-form-submit');
    if (editPlayerForm) {
        editPlayerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('edit-player-name').value.trim();
            if (!name) {
                alert('Họ và tên cầu thủ không được để trống.');
                showToast('Họ và tên cầu thủ không được để trống.', 'error');
                return;
            }

            const phone = document.getElementById('edit-player-phone').value.trim();

            // Validate số điện thoại Việt Nam
            if (phone !== '' && !/^0\d{9}$/.test(phone)) {
                alert('Số điện thoại sai định dạng.');
                showToast('Số điện thoại sai định dạng.', 'error');
                return;
            }

            // Validate số áo (từ 1 đến 99)
            const shirtVal = document.getElementById('edit-player-shirt').value;
            if (shirtVal !== '') {
                const shirtNum = parseInt(shirtVal);
                if (isNaN(shirtNum) || shirtNum < 1 || shirtNum > 99) {
                    alert('Số áo sai định dạng.');
                    showToast('Số áo sai định dạng.', 'error');
                    return;
                }
            }

            const payload = {
                id: parseInt(document.getElementById('edit-player-id').value),
                name: name,
                shirt_number: parseInt(document.getElementById('edit-player-shirt').value) || null,
                position: document.getElementById('edit-player-position').value,
                phone: phone,
                avatar_url: document.getElementById('edit-player-avatar').value.trim(),
                join_date: document.getElementById('edit-player-joindate').value || new Date().toISOString().substring(0, 10),
                status: document.getElementById('edit-player-status').value
            };

            fetch('api/update_player.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(async res => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || data.error || 'Không thể cập nhật cầu thủ');
                    }
                    return data;
                })
                .then(data => {
                    if (data.success) {
                        alert('Cập nhật cầu thủ thành công!');
                        showToast('Cập nhật cầu thủ thành công!', 'success');
                        document.getElementById('edit-player-modal').classList.remove('active');
                        editPlayerForm.reset();
                        switchView('players', 'Đội Hình');
                    } else {
                        alert(data.message || 'Lỗi cập nhật cầu thủ');
                        showToast(data.message || 'Lỗi cập nhật cầu thủ', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi: ' + err.message);
                    showToast('Lỗi: ' + err.message, 'error');
                });
        });
    }

    // 3. Submit Match (Add)
    const matchForm = document.getElementById('match-form-submit');
    if (matchForm) {
        matchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const selectedDate = new Date(document.getElementById('match-date').value);
            const now = new Date();
            const status = selectedDate < now ? 'Finished' : 'Upcoming';
            const ourScoreVal = document.getElementById('match-our-score').value;
            const oppScoreVal = document.getElementById('match-opp-score').value;

            const payload = {
                opponent: document.getElementById('match-opponent').value.trim(),
                match_date: document.getElementById('match-date').value,
                stadium: document.getElementById('match-stadium').value.trim(),
                status: status,
                our_score: status === 'Finished' && ourScoreVal !== '' ? parseInt(ourScoreVal) : null,
                opp_score: status === 'Finished' && oppScoreVal !== '' ? parseInt(oppScoreVal) : null
            };

            fetch('api/add_match.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => {
                    if (!res.ok) throw new Error('Không thể thêm trận đấu');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        alert('Thêm trận đấu thành công!');
                        document.getElementById('match-modal').classList.remove('active');
                        matchForm.reset();
                        switchView('matches', 'Lịch Thi Đấu');
                    } else {
                        alert(data.message || 'Lỗi thêm trận đấu');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi kết nối máy chủ: ' + err.message);
                });
        });
    }

    // 4. Submit Edit Match
    const editMatchForm = document.getElementById('edit-match-form-submit');
    if (editMatchForm) {
        editMatchForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Thu thập thống kê phong độ cầu thủ
            const performances = [];
            const rows = document.querySelectorAll('#performance-players-list .perf-row');
            rows.forEach(row => {
                const player_id = parseInt(row.getAttribute('data-player-id'));
                const goals = row.querySelector('.perf-goals').value;
                const assists = row.querySelector('.perf-assists').value;
                const rating = row.querySelector('.perf-rating').value;

                if (goals !== '' || assists !== '' || rating !== '') {
                    performances.push({
                        player_id,
                        goals: goals !== '' ? parseInt(goals) : 0,
                        assists: assists !== '' ? parseInt(assists) : 0,
                        rating: rating !== '' ? parseFloat(rating) : 0.0
                    });
                }
            });

            const statusVal = document.getElementById('edit-match-status').value;
            
            // Validate: Nếu là Finished (Đã kết thúc) thì yêu cầu nhập tỉ số
            if (statusVal === 'Finished') {
                const ourScoreVal = document.getElementById('edit-match-our-score').value;
                const oppScoreVal = document.getElementById('edit-match-opp-score').value;
                if (ourScoreVal === '' || oppScoreVal === '') {
                    alert('Vui lòng nhập đầy đủ tỉ số cho trận đấu đã diễn ra!');
                    return;
                }
            }

            const noteVal = document.getElementById('edit-match-note').value.trim();
            if (statusVal === 'Postponed') {
                // Đối với trận hoãn, không có tỉ số và phong độ
                document.getElementById('edit-match-our-score').value = '';
                document.getElementById('edit-match-opp-score').value = '';
            }

            const payload = {
                id: parseInt(document.getElementById('edit-match-id').value),
                opponent: document.getElementById('edit-match-opponent').value.trim(),
                match_date: document.getElementById('edit-match-date').value,
                stadium: document.getElementById('edit-match-stadium').value.trim(),
                status: statusVal,
                note: noteVal,
                our_score: statusVal === 'Finished' && document.getElementById('edit-match-our-score').value !== '' ? parseInt(document.getElementById('edit-match-our-score').value) : null,
                opp_score: statusVal === 'Finished' && document.getElementById('edit-match-opp-score').value !== '' ? parseInt(document.getElementById('edit-match-opp-score').value) : null,
                performances: statusVal === 'Finished' ? performances : []
            };

            fetch('api/update_match.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => {
                    if (!res.ok) throw new Error('Không thể cập nhật trận đấu');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        alert('Cập nhật trận đấu thành công!');
                        document.getElementById('edit-match-modal').classList.remove('active');
                        editMatchForm.reset();
                        switchView('matches', 'Lịch Thi Đấu');
                    } else {
                        alert(data.message || 'Lỗi cập nhật trận đấu');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi kết nối máy chủ: ' + err.message);
                });
        });
    }

    // 5. Submit Fund (Add)
    const fundForm = document.getElementById('fund-form-submit');
    if (fundForm) {
        fundForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const selectedDate = document.getElementById('fund-date').value;
            let finalDateTime = '';
            if (selectedDate) {
                const now = new Date();
                const timePart = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
                finalDateTime = `${selectedDate} ${timePart}`;
            } else {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const timePart = now.toTimeString().split(' ')[0];
                finalDateTime = `${year}-${month}-${day} ${timePart}`;
            }

            const payload = {
                type: document.getElementById('fund-type').value,
                amount: parseFloat(document.getElementById('fund-amount').value),
                date: finalDateTime,
                description: document.getElementById('fund-description').value.trim()
            };

            fetch('api/add_transaction.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => {
                    if (!res.ok) throw new Error('Không thể ghi nhận quỹ');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        alert('Ghi nhận quỹ thành công!');
                        document.getElementById('fund-modal').classList.remove('active');
                        fundForm.reset();
                        switchView('funds', 'Quỹ Đội');
                    } else {
                        alert(data.message || 'Lỗi thêm thu chi');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi kết nối máy chủ: ' + err.message);
                });
        });
    }

    // 6. Submit Edit Fund
    const editFundForm = document.getElementById('edit-fund-form-submit');
    if (editFundForm) {
        editFundForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const selectedDate = document.getElementById('edit-fund-date').value;
            const oldTime = editFundForm.dataset.time || '00:00:00';
            const payload = {
                id: parseInt(document.getElementById('edit-fund-id').value),
                type: document.getElementById('edit-fund-type').value,
                amount: parseFloat(document.getElementById('edit-fund-amount').value),
                date: selectedDate ? `${selectedDate} ${oldTime}` : new Date().toISOString().substring(0, 10) + ' ' + oldTime,
                description: document.getElementById('edit-fund-description').value.trim()
            };

            fetch('api/update_transaction.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => {
                    if (!res.ok) throw new Error('Không thể cập nhật quỹ');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        alert('Cập nhật quỹ thành công!');
                        document.getElementById('edit-fund-modal').classList.remove('active');
                        editFundForm.reset();
                        switchView('funds', 'Quỹ Đội');
                    } else {
                        alert(data.message || 'Lỗi cập nhật quỹ');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi kết nối máy chủ: ' + err.message);
                });
        });
    }

    // Kiểm soát ẩn/hiện trường tỉ số & phong độ cầu thủ trong modal cập nhật trận đấu dựa trên trạng thái
    const editMatchStatus = document.getElementById('edit-match-status');
    const editMatchScoreGroup = document.getElementById('edit-match-score-group');
    const editMatchPerfSection = document.getElementById('edit-match-performance-section');
    const editMatchModalContent = document.querySelector('#edit-match-modal .modal-content');
    if (editMatchStatus && editMatchScoreGroup) {
        editMatchStatus.addEventListener('change', () => {
            const noteLabel = document.getElementById('edit-match-note-label');
            const noteField = document.getElementById('edit-match-note');
            if (editMatchStatus.value === 'Finished') {
                editMatchScoreGroup.style.display = 'flex';
                if (editMatchPerfSection) editMatchPerfSection.style.display = 'block';
                if (editMatchModalContent) editMatchModalContent.style.maxWidth = '850px';
                if (noteLabel) noteLabel.textContent = 'Ghi Chú';
                if (noteField) noteField.placeholder = 'Ghi chú trận đấu';
            } else if (editMatchStatus.value === 'Postponed') {
                editMatchScoreGroup.style.display = 'none';
                if (editMatchPerfSection) editMatchPerfSection.style.display = 'none';
                if (editMatchModalContent) editMatchModalContent.style.maxWidth = '450px';
                if (noteLabel) noteLabel.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: var(--danger-color); margin-right: 4px;"></i> Lý do hoãn';
                if (noteField) noteField.placeholder = 'Ví dụ: Bão Yagi, thời tiết xấu...';
            } else {
                editMatchScoreGroup.style.display = 'none';
                if (editMatchPerfSection) editMatchPerfSection.style.display = 'none';
                if (editMatchModalContent) editMatchModalContent.style.maxWidth = '450px';
                if (noteLabel) noteLabel.textContent = 'Ghi Chú';
                if (noteField) noteField.placeholder = 'Ghi chú trận đấu';
            }
        });
    }

    // Kiểm soát ẩn/hiện trường tỉ số trong modal thêm trận đấu dựa trên thời gian thực tế chọn
    const addMatchDate = document.getElementById('match-date');
    const addMatchScoreGroup = document.getElementById('add-match-score-group');
    if (addMatchDate && addMatchScoreGroup) {
        addMatchDate.addEventListener('change', () => {
            const selectedDate = new Date(addMatchDate.value);
            const now = new Date();
            if (selectedDate < now) {
                addMatchScoreGroup.style.display = 'flex';
            } else {
                addMatchScoreGroup.style.display = 'none';
            }
        });
    }

    // 7. Submit Photo (Add to Album)
    const photoForm = document.getElementById('photo-form-submit');
    if (photoForm) {
        photoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('photo-file');
            const titleInput = document.getElementById('photo-title');

            if (fileInput.files.length === 0) {
                alert('Vui lòng chọn một bức ảnh!');
                return;
            }

            const formData = new FormData();
            formData.append('photo', fileInput.files[0]);
            formData.append('title', titleInput.value.trim());

            fetch('api/upload_photo.php', {
                method: 'POST',
                body: formData
            })
                .then(res => {
                    if (!res.ok) throw new Error('Không thể tải ảnh lên');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        alert('Tải ảnh kỷ niệm thành công!');
                        document.getElementById('photo-modal').classList.remove('active');
                        photoForm.reset();
                        switchView('album', 'Ảnh Kỉ Niệm');
                    } else {
                        alert(data.message || 'Lỗi tải lên ảnh');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi kết nối máy chủ: ' + err.message);
                });
        });
    }
}

/**
 * 6. EVENT DELEGATION - LẮNG NGHE SỰ KIỆN CLICK TOÀN CỤC (SPA INTERACTIONS)
 */
function initEventDelegation() {
    document.addEventListener('click', (e) => {
        // --- 1. Mở modal thêm dữ liệu ---
        if (e.target.closest('#add-player-btn')) {
            document.getElementById('player-modal').classList.add('active');
            document.getElementById('player-joindate').value = new Date().toISOString().substring(0, 10);
            document.getElementById('player-avatar-file').value = '';
            document.getElementById('player-avatar').value = '';
        }

        if (e.target.closest('#add-match-btn')) {
            document.getElementById('match-modal').classList.add('active');
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('match-date').value = now.toISOString().slice(0, 16);

            // Ẩn cụm tỉ số và reset giá trị về trống khi mở modal
            const addMatchScoreGroup = document.getElementById('add-match-score-group');
            if (addMatchScoreGroup) addMatchScoreGroup.style.display = 'none';
            const ourScore = document.getElementById('match-our-score');
            const oppScore = document.getElementById('match-opp-score');
            if (ourScore) ourScore.value = '';
            if (oppScore) oppScore.value = '';
        }

        if (e.target.closest('#add-fund-btn')) {
            document.getElementById('fund-modal').classList.add('active');
            document.getElementById('fund-date').value = new Date().toISOString().substring(0, 10);
        }

        // --- 2. Sửa cầu thủ ---
        const editPlayerBtn = e.target.closest('.edit-player-trigger');
        if (editPlayerBtn) {
            const id = editPlayerBtn.getAttribute('data-id');
            openEditPlayerModal(id);
        }

        // --- 3. Xóa cầu thủ ---
        const deletePlayerBtn = e.target.closest('.delete-player-trigger');
        if (deletePlayerBtn) {
            const id = deletePlayerBtn.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa cầu thủ này khỏi đội hình?')) {
                deletePlayer(id);
            }
        }

        // --- 4. Sửa trận đấu ---
        const editMatchBtn = e.target.closest('.edit-match-trigger');
        if (editMatchBtn) {
            const id = editMatchBtn.getAttribute('data-id');
            openEditMatchModal(id);
        }

        // --- Mở Sa bàn & Điểm danh ---
        const lineupBtn = e.target.closest('.lineup-trigger-btn');
        if (lineupBtn) {
            const id = lineupBtn.getAttribute('data-id');
            switchView('lineup', 'Sa Bàn Chiến Thuật & Điểm Danh', id);
        }

        // --- 5. Xóa trận đấu ---
        const deleteMatchBtn = e.target.closest('.delete-match-trigger');
        if (deleteMatchBtn) {
            const id = deleteMatchBtn.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa trận đấu này khỏi lịch trình?')) {
                deleteMatch(id);
            }
        }

        // --- 6. Sửa giao dịch quỹ ---
        const editFundBtn = e.target.closest('.edit-fund-trigger');
        if (editFundBtn) {
            const id = editFundBtn.getAttribute('data-id');
            openEditFundModal(id);
        }

        // --- 7. Xóa giao dịch quỹ ---
        const deleteFundBtn = e.target.closest('.delete-fund-trigger');
        if (deleteFundBtn) {
            const id = deleteFundBtn.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa giao dịch thu/chi này?')) {
                deleteFund(id);
            }
        }

        // --- 8. Mở modal thêm ảnh kỷ niệm ---
        if (e.target.closest('#add-photo-btn')) {
            document.getElementById('photo-modal').classList.add('active');
            document.getElementById('photo-file').value = '';
            document.getElementById('photo-title').value = '';
        }

        // --- 9. Xóa ảnh kỷ niệm ---
        const deletePhotoBtn = e.target.closest('.delete-photo-trigger');
        if (deletePhotoBtn) {
            const id = deletePhotoBtn.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa bức ảnh kỷ niệm này?')) {
                fetch(`api/delete_photo.php?id=${id}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
                        return res.json();
                    })
                    .then(data => {
                        if (data.success) {
                            alert('Đã xóa ảnh kỷ niệm thành công!');
                            switchView('album', 'Ảnh Kỉ Niệm');
                        } else {
                            alert(data.message || 'Lỗi xóa ảnh kỷ niệm');
                        }
                    })
                    .catch(err => alert('Lỗi: ' + err.message));
            }
        }
    });
}

/**
 * 7. CÁC HÀM PHỤ TRỢ SỬA / XÓA DỮ LIỆU
 */

// Điền dữ liệu cũ vào modal sửa cầu thủ
function openEditPlayerModal(id) {
    const p = currentPlayers.find(x => x.id == id);
    if (!p) return;

    document.getElementById('edit-player-id').value = p.id;
    document.getElementById('edit-player-name').value = p.name;
    document.getElementById('edit-player-shirt').value = p.shirt_number !== null ? p.shirt_number : '';
    document.getElementById('edit-player-position').value = p.position || 'Thủ môn';
    document.getElementById('edit-player-phone').value = p.phone || '';
    document.getElementById('edit-player-avatar').value = p.avatar_url || '';
    document.getElementById('edit-player-joindate').value = p.join_date || new Date().toISOString().substring(0, 10);
    document.getElementById('edit-player-status').value = p.status || 'Active';

    document.getElementById('edit-player-avatar-file').value = '';

    document.getElementById('edit-player-modal').classList.add('active');
}

// Gọi API xóa cầu thủ
function deletePlayer(id) {
    fetch(`api/delete_player.php?id=${id}`)
        .then(res => {
            if (!res.ok) throw new Error('Không thể kết nối máy chủ');
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert('Đã xóa cầu thủ thành công!');
                switchView('players', 'Đội Hình');
            } else {
                alert(data.message || 'Lỗi xóa cầu thủ');
            }
        })
        .catch(err => alert('Lỗi: ' + err.message));
}

// Điền dữ liệu cũ vào modal sửa trận đấu
function openEditMatchModal(id) {
    const m = currentMatches.find(x => x.id == id);
    if (!m) return;

    document.getElementById('edit-match-id').value = m.id;
    document.getElementById('edit-match-opponent').value = m.opponent;

    // Phân tích định dạng ngày từ "H:i - d/m/Y" sang "YYYY-MM-DDTHH:MM" để hiển thị trên input datetime-local
    let formattedDate = '';
    if (m.match_date) {
        const parts = m.match_date.split(' - ');
        if (parts.length === 2) {
            const time = parts[0]; // "19:30"
            const dateParts = parts[1].split('/'); // ["10", "06", "2026"]
            if (dateParts.length === 3) {
                formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T${time}`;
            }
        }
    }

    document.getElementById('edit-match-date').value = formattedDate || m.match_date;
    document.getElementById('edit-match-stadium').value = m.stadium || '';
    // Tự động gợi ý trạng thái "Đã kết thúc" nếu thời gian trận đấu đã ở quá khứ mà trạng thái vẫn là "Sắp diễn ra"
    let isPast = false;
    if (formattedDate) {
        const jsDate = new Date(formattedDate);
        isPast = jsDate < new Date();
    }
    let currentStatus = m.status || 'Upcoming';
    if (currentStatus === 'Upcoming' && isPast) {
        currentStatus = 'Finished';
    }

    document.getElementById('edit-match-status').value = currentStatus;
    document.getElementById('edit-match-status').dispatchEvent(new Event('change'));
    document.getElementById('edit-match-our-score').value = m.our_score !== null ? m.our_score : '';
    document.getElementById('edit-match-opp-score').value = m.opp_score !== null ? m.opp_score : '';

    // Cập nhật ẩn hiện tỉ số, lý do hoãn & phong độ cầu thủ và điều chỉnh kích thước modal
    const scoreGroup = document.getElementById('edit-match-score-group');
    const perfSection = document.getElementById('edit-match-performance-section');
    const modalContent = document.querySelector('#edit-match-modal .modal-content');
    const noteLabel = document.getElementById('edit-match-note-label');
    const noteField = document.getElementById('edit-match-note');

    if (currentStatus === 'Finished') {
        scoreGroup.style.display = 'flex';
        if (perfSection) perfSection.style.display = 'block';
        if (modalContent) modalContent.style.maxWidth = '850px';
        if (noteLabel) noteLabel.textContent = 'Ghi Chú';
        if (noteField) {
            noteField.placeholder = 'Ghi chú trận đấu';
            noteField.value = m.note || '';
        }
    } else if (currentStatus === 'Postponed') {
        scoreGroup.style.display = 'none';
        if (perfSection) perfSection.style.display = 'none';
        if (modalContent) modalContent.style.maxWidth = '450px';
        if (noteLabel) noteLabel.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: var(--danger-color); margin-right: 4px;"></i> Lý do hoãn';
        if (noteField) {
            noteField.placeholder = 'Ví dụ: Bão Yagi, thời tiết xấu...';
            noteField.value = m.note || '';
        }
    } else {
        scoreGroup.style.display = 'none';
        if (perfSection) perfSection.style.display = 'none';
        if (modalContent) modalContent.style.maxWidth = '450px';
        if (noteLabel) noteLabel.textContent = 'Ghi Chú';
        if (noteField) {
            noteField.placeholder = 'Ghi chú trận đấu';
            noteField.value = m.note || '';
        }
    }

    // Tải danh sách cầu thủ và điền phong độ cũ (nếu có) của trận đấu này
    loadPerformancePlayers(id);

    document.getElementById('edit-match-modal').classList.add('active');
}

// Gọi API xóa trận đấu
function deleteMatch(id) {
    fetch(`api/delete_match.php?id=${id}`)
        .then(res => {
            if (!res.ok) throw new Error('Không thể kết nối máy chủ');
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert('Đã xóa trận đấu thành công!');
                switchView('matches', 'Lịch Thi Đấu');
            } else {
                alert(data.message || 'Lỗi xóa trận đấu');
            }
        })
        .catch(err => alert('Lỗi: ' + err.message));
}

// Điền dữ liệu cũ vào modal sửa quỹ đội
function openEditFundModal(id) {
    const f = currentFunds.find(x => x.id == id);
    if (!f) return;

    document.getElementById('edit-fund-id').value = f.id;
    document.getElementById('edit-fund-type').value = f.type || 'thu';
    document.getElementById('edit-fund-amount').value = f.amount || '';

    // f.date có dạng "HH:mm:ss - dd/MM/yyyy" hoặc "dd/MM/yyyy"
    let formattedDate = '';
    let timePart = '00:00:00';
    if (f.date) {
        const mainParts = f.date.split(' - ');
        if (mainParts.length === 2) {
            timePart = mainParts[0]; // "HH:mm:ss"
            const dateParts = mainParts[1].split('/');
            if (dateParts.length === 3) {
                formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            }
        } else {
            const dateParts = f.date.split('/');
            if (dateParts.length === 3) {
                formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            }
        }
    }

    // Lưu lại giờ của giao dịch để khi lưu edit sẽ giữ nguyên giờ cũ
    const editFundForm = document.getElementById('edit-fund-form-submit');
    if (editFundForm) {
        editFundForm.dataset.time = timePart;
    }

    document.getElementById('edit-fund-date').value = formattedDate || f.date;
    document.getElementById('edit-fund-description').value = f.description || '';

    document.getElementById('edit-fund-modal').classList.add('active');
}

// Gọi API xóa giao dịch quỹ
function deleteFund(id) {
    fetch(`api/delete_transaction.php?id=${id}`)
        .then(res => {
            if (!res.ok) throw new Error('Không thể kết nối máy chủ');
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert('Đã xóa giao dịch thành công!');
                switchView('funds', 'Quỹ Đội');
            } else {
                alert(data.message || 'Lỗi xóa giao dịch');
            }
        })
        .catch(err => alert('Lỗi: ' + err.message));
}

/**
 * 8. XỬ LÝ RESIZE ẢNH BẰNG CANVAS & UPLOAD (CLIENT-SIDE IMAGE COMPRESSION)
 */

// Hàm nén & Resize ảnh bằng Canvas API
function resizeImage(file, size = 300) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                // Crop Center tỉ lệ 1:1 hình vuông cực đẹp cho avatar
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;

                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Nén ảnh thất bại'));
                    }
                }, 'image/jpeg', 0.85); // Nén JPEG chất lượng 85% để nén tối đa mà ảnh vẫn nét
            };
            img.onerror = () => reject(new Error('Không thể đọc file ảnh'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Lỗi FileReader'));
        reader.readAsDataURL(file);
    });
}

// Lắng nghe thay đổi của ô chọn file để tự động xử lý và upload ảnh
function handleAvatarUpload(fileInputId, textInputId) {
    const fileInput = document.getElementById(fileInputId);
    const textInput = document.getElementById(textInputId);
    if (!fileInput || !textInput) return;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Hiển thị trạng thái đang xử lý tải lên
        textInput.value = 'Đang nén & tải ảnh đại diện lên...';
        textInput.disabled = true;

        try {
            // Resize ảnh tại Client-side thành 300x300 px
            const resizedBlob = await resizeImage(file, 300);

            // Đóng gói dữ liệu gửi lên backend PHP
            const formData = new FormData();
            formData.append('avatar', resizedBlob, 'avatar.jpg');

            const response = await fetch('api/upload_avatar.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Kết nối server tải ảnh thất bại');
            const data = await response.json();

            if (data.success) {
                textInput.value = data.url; // Đường dẫn tương đối như "uploads/avatar_..." để lưu DB
            } else {
                alert('Tải ảnh thất bại: ' + data.message);
                textInput.value = '';
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi xử lý ảnh: ' + error.message);
            textInput.value = '';
        } finally {
            textInput.disabled = false;
        }
    });
}

// Hàm chuyển đổi và lưu theme
function setTheme(themeName) {
    if (themeName === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
    localStorage.setItem('theme', themeName);

    // Cập nhật lại hình nền với màu overlay tương ứng của theme mới
    const bgUrl = localStorage.getItem('bg_image');
    if (bgUrl) {
        setBgImage(bgUrl);
    }
}

// Hàm thiết lập ảnh nền với các thuộc tính CSS tương ứng
function setBgImage(bgUrl) {
    if (!bgUrl || bgUrl === 'default') {
        document.body.style.backgroundImage = '';
        localStorage.removeItem('bg_image');
    } else {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (currentTheme === 'light') {
            document.body.style.backgroundImage = `linear-gradient(rgba(241, 245, 249, 0.6), rgba(241, 245, 249, 0.75)), url('${bgUrl}')`;
        } else {
            document.body.style.backgroundImage = `linear-gradient(rgba(2, 6, 23, 0.6), rgba(2, 6, 23, 0.75)), url('${bgUrl}')`;
        }
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
        localStorage.setItem('bg_image', bgUrl);
    }
}

/**
 * Tải danh sách cầu thủ và các thông số phong độ trận đấu
 */
async function loadPerformancePlayers(matchId) {
    const listContainer = document.getElementById('performance-players-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:10px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách...</div>';

    try {
        // 1. Tải danh sách cầu thủ nếu chưa có
        if (currentPlayers.length === 0) {
            const resPlayers = await fetch('api/api.php?action=get_players');
            if (resPlayers.ok) {
                currentPlayers = await resPlayers.json();
            }
        }

        // 2. Tải phong độ cũ của trận đấu
        let oldPerformances = [];
        const resPerf = await fetch(`api/api.php?action=get_match_performances&match_id=${matchId}`);
        if (resPerf.ok) {
            oldPerformances = await resPerf.json();
        }

        // 3. Render danh sách các cầu thủ và input nhập phong độ
        if (currentPlayers.length === 0) {
            listContainer.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:10px;">Không có cầu thủ nào để thống kê.</div>';
            return;
        }

        // Tạo Header cho danh sách nhập phong độ
        let html = `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; margin-bottom: 6px; gap: 10px;">
                <span style="flex: 1.5; min-width: 140px;">Cầu thủ</span>
                <div style="display: flex; gap: 8px; flex: 2; justify-content: flex-end; min-width: 180px; text-align: center;">
                    <span style="width: 42px;">Bàn</span>
                    <span style="width: 42px;">Kiến</span>
                    <span style="width: 50px;">Điểm</span>
                </div>
            </div>
        `;

        currentPlayers.forEach(p => {
            const pPerf = oldPerformances.find(x => x.player_id == p.id) || {};
            const goals = pPerf.goals !== undefined ? pPerf.goals : '';
            const assists = pPerf.assists !== undefined ? pPerf.assists : '';
            const rating = pPerf.rating !== undefined ? pPerf.rating : '';

            html += `
                <div class="perf-row" data-player-id="${p.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1.5; min-width: 140px; overflow: hidden;">
                        <img src="${p.avatar_url || 'https://via.placeholder.com/24'}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                        <span style="font-weight: 500; font-size: 0.85rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" title="#${p.shirt_number || '0'} - ${p.name}">#${p.shirt_number || '0'} - ${p.name}</span>
                    </div>
                    <div style="display: flex; gap: 8px; flex: 2; justify-content: flex-end; align-items: center; min-width: 180px;">
                        <input type="number" class="perf-goals form-control" value="${goals}" placeholder="0" min="0" style="width: 42px; padding: 4px; font-size: 0.8rem; text-align: center;">
                        <input type="number" class="perf-assists form-control" value="${assists}" placeholder="0" min="0" style="width: 42px; padding: 4px; font-size: 0.8rem; text-align: center;">
                        <input type="number" class="perf-rating form-control" value="${rating}" placeholder="0.0" min="0" max="10" step="0.1" style="width: 50px; padding: 4px; font-size: 0.8rem; text-align: center;">
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    } catch (e) {
        console.error('Lỗi tải danh sách phong độ cầu thủ:', e);
        listContainer.innerHTML = '<div style="color:var(--danger-color); text-align:center; padding:10px;">Lỗi tải danh sách cầu thủ.</div>';
    }
}

/**
 * Hiển thị thông báo Toast Notification đẹp mắt và hiện đại
 */
function showToast(message, type = 'error') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon tương ứng
    let iconClass = 'fa-solid fa-circle-exclamation';
    if (type === 'success') {
        iconClass = 'fa-solid fa-circle-check';
    } else if (type === 'warning') {
        iconClass = 'fa-solid fa-triangle-exclamation';
    }

    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Kích hoạt animation trượt vào
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);

    // Tự động đóng sau 4 giây
    const hideTimeout = setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);

    // Đóng khi click vào
    toast.addEventListener('click', () => {
        clearTimeout(hideTimeout);
        toast.classList.remove('active');
        setTimeout(() => {
            toast.remove();
        }, 400);
    });
}

// =========================================================================
// PHÂN HỆ: SA BÀN CHIẾN THUẬT & ĐIỂM DANH (LINEUP & ATTENDANCE CORE LOGIC)
// =========================================================================

// Cấu hình các sơ đồ chiến thuật chuẩn (tọa độ phần trăm x, y)
const formationsConfig = {
    '7': {
        '2-3-1': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LCB', x: 30, y: 72, label: 'DF' },
            { role: 'RCB', x: 70, y: 72, label: 'DF' },
            { role: 'CM', x: 50, y: 50, label: 'CM' },
            { role: 'LM', x: 20, y: 40, label: 'LM' },
            { role: 'RM', x: 80, y: 40, label: 'RM' },
            { role: 'FW', x: 50, y: 18, label: 'FW' }
        ],
        '3-2-1': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LCB', x: 25, y: 72, label: 'DF' },
            { role: 'CB', x: 50, y: 75, label: 'DF' },
            { role: 'RCB', x: 75, y: 72, label: 'DF' },
            { role: 'LM', x: 35, y: 45, label: 'MF' },
            { role: 'RM', x: 65, y: 45, label: 'MF' },
            { role: 'FW', x: 50, y: 18, label: 'FW' }
        ],
        '3-1-2': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LCB', x: 25, y: 72, label: 'DF' },
            { role: 'CB', x: 50, y: 75, label: 'DF' },
            { role: 'RCB', x: 75, y: 72, label: 'DF' },
            { role: 'CM', x: 50, y: 46, label: 'MF' },
            { role: 'LF', x: 35, y: 20, label: 'FW' },
            { role: 'RF', x: 65, y: 20, label: 'FW' }
        ],
        '1-4-1': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'CB', x: 50, y: 72, label: 'DF' },
            { role: 'LM', x: 18, y: 45, label: 'LM' },
            { role: 'LCM', x: 38, y: 48, label: 'MF' },
            { role: 'RCM', x: 62, y: 48, label: 'MF' },
            { role: 'RM', x: 82, y: 45, label: 'RM' },
            { role: 'FW', x: 50, y: 18, label: 'FW' }
        ]
    },
    '11': {
        '4-3-3': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LB', x: 15, y: 70, label: 'LB' },
            { role: 'LCB', x: 38, y: 74, label: 'CB' },
            { role: 'RCB', x: 62, y: 74, label: 'CB' },
            { role: 'RB', x: 85, y: 70, label: 'RB' },
            { role: 'LCM', x: 30, y: 45, label: 'CM' },
            { role: 'CDM', x: 50, y: 52, label: 'DM' },
            { role: 'RCM', x: 70, y: 45, label: 'CM' },
            { role: 'LW', x: 20, y: 22, label: 'LW' },
            { role: 'ST', x: 50, y: 16, label: 'ST' },
            { role: 'RW', x: 80, y: 22, label: 'RW' }
        ],
        '4-4-2': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LB', x: 15, y: 70, label: 'LB' },
            { role: 'LCB', x: 38, y: 74, label: 'CB' },
            { role: 'RCB', x: 62, y: 74, label: 'CB' },
            { role: 'RB', x: 85, y: 70, label: 'RB' },
            { role: 'LM', x: 18, y: 45, label: 'LM' },
            { role: 'LCM', x: 38, y: 48, label: 'CM' },
            { role: 'RCM', x: 62, y: 48, label: 'CM' },
            { role: 'RM', x: 82, y: 45, label: 'RM' },
            { role: 'LS', x: 38, y: 18, label: 'ST' },
            { role: 'RS', x: 62, y: 18, label: 'ST' }
        ],
        '3-5-2': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LCB', x: 25, y: 72, label: 'CB' },
            { role: 'CB', x: 50, y: 75, label: 'CB' },
            { role: 'RCB', x: 75, y: 72, label: 'CB' },
            { role: 'LWB', x: 15, y: 45, label: 'LWB' },
            { role: 'LCM', x: 35, y: 48, label: 'CM' },
            { role: 'CDM', x: 50, y: 56, label: 'DM' },
            { role: 'RCM', x: 65, y: 48, label: 'CM' },
            { role: 'RWB', x: 85, y: 45, label: 'RWB' },
            { role: 'LS', x: 38, y: 18, label: 'ST' },
            { role: 'RS', x: 62, y: 18, label: 'ST' }
        ],
        '4-2-3-1': [
            { role: 'GK', x: 50, y: 88, label: 'GK' },
            { role: 'LB', x: 15, y: 70, label: 'LB' },
            { role: 'LCB', x: 38, y: 74, label: 'CB' },
            { role: 'RCB', x: 62, y: 74, label: 'CB' },
            { role: 'RB', x: 85, y: 70, label: 'RB' },
            { role: 'LDMC', x: 35, y: 55, label: 'DM' },
            { role: 'RDMC', x: 65, y: 55, label: 'DM' },
            { role: 'LAM', x: 22, y: 32, label: 'AM' },
            { role: 'CAM', x: 50, y: 30, label: 'AM' },
            { role: 'RAM', x: 78, y: 32, label: 'AM' },
            { role: 'ST', x: 50, y: 16, label: 'ST' }
        ]
    }
};

// Biến lưu trữ ID cầu thủ đang được chọn để xếp đội hình (Click-to-place cho di động)
let selectedPlayerIdForLineup = null;

/**
 * Render Giao Diện Sa Bàn & Điểm Danh
 */
function renderLineup(matchId, data) {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Gán dữ liệu vào các biến toàn cục
    activeLineup.match_id = matchId;
    activeLineup.pitch_type = data.lineup.pitch_type || '7';
    activeLineup.formation = data.lineup.formation || '2-3-1';
    activeLineup.positions = data.lineup.player_positions || [];
    lineupPlayers = data.players || [];
    selectedPlayerIdForLineup = null; // Reset chọn lựa

    // Tính toán số liệu thống kê điểm danh
    const statGoing = lineupPlayers.filter(p => p.attendance_status === 'going').length;
    const statLate = lineupPlayers.filter(p => p.attendance_status === 'late').length;
    const statAbsent = lineupPlayers.filter(p => p.attendance_status === 'absent').length;
    const statNoResponse = lineupPlayers.filter(p => p.attendance_status === 'no_response').length;

    // 1. Tạo HTML cho cột bên trái (Điểm danh)
    let attendanceHTML = `
        <div class="glass-panel attendance-card" style="padding:20px;">
            <h3 style="font-family:'Outfit'; margin-bottom:15px;"><i class="fa-solid fa-clipboard-user" style="color:var(--accent-secondary)"></i> Danh Sách Điểm Danh</h3>
            
            <div class="attendance-header-summary">
                <div class="summary-item-badge" style="color:var(--accent-primary)">
                    <i class="fa-solid fa-circle-check"></i> Đi đá: ${statGoing}
                </div>
                <div class="summary-item-badge" style="color:var(--accent-warning)">
                    <i class="fa-solid fa-clock"></i> Đi trễ: ${statLate}
                </div>
                <div class="summary-item-badge" style="color:var(--accent-danger)">
                    <i class="fa-solid fa-circle-xmark"></i> Vắng: ${statAbsent}
                </div>
                <div class="summary-item-badge" style="color:var(--text-muted)">
                    <i class="fa-solid fa-circle-question"></i> Chưa rep: ${statNoResponse}
                </div>
            </div>
    `;

    // A. Mục tự điểm danh tự do (Cho mọi thành viên)
    attendanceHTML += `
        <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:var(--border-radius-md); margin-bottom:15px; border:1px solid rgba(255,255,255,0.05);">
            <h4 style="font-size:0.9rem; margin-bottom:10px; color:var(--text-primary);"><i class="fa-solid fa-user-pen"></i> Tự Điểm Danh Cho Bạn</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <select id="self-player-select" class="form-control" style="width:100%; font-size:0.85rem;">
                    <option value="">-- Chọn tên của bạn --</option>
                    ${lineupPlayers.map(p => `<option value="${p.id}">${p.shirt_number ? `[${p.shirt_number}] ` : ''}${p.name} (${p.position})</option>`).join('')}
                </select>
                <div style="display:flex; gap:8px; justify-content:space-between; align-items:center; margin-top:5px;">
                    <span style="font-size:0.8rem; color:var(--text-secondary);">Trạng thái:</span>
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="btn-primary self-status-btn going" onclick="setSelfStatusBtn('going')" style="padding:4px 10px; font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); box-shadow:none; border-radius:4px;"><i class="fa-solid fa-circle-check" style="color:var(--accent-primary)"></i> Đi</button>
                        <button type="button" class="btn-primary self-status-btn late" onclick="setSelfStatusBtn('late')" style="padding:4px 10px; font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); box-shadow:none; border-radius:4px;"><i class="fa-solid fa-clock" style="color:var(--accent-warning)"></i> Trễ</button>
                        <button type="button" class="btn-primary self-status-btn absent" onclick="setSelfStatusBtn('absent')" style="padding:4px 10px; font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); box-shadow:none; border-radius:4px;"><i class="fa-solid fa-circle-xmark" style="color:var(--accent-danger)"></i> Vắng</button>
                    </div>
                </div>
                <input type="text" id="self-note" class="form-control" placeholder="Lý do vắng hoặc ghi chú đi trễ..." style="font-size:0.8rem; padding:6px 10px; display:none;">
                <button type="button" class="btn-primary" onclick="submitSelfAttendance(${matchId})" style="font-size:0.8rem; padding:6px 12px; margin-top:5px; justify-content:center;">
                    <i class="fa-solid fa-floppy-disk"></i> Xác nhận điểm danh
                </button>
            </div>
        </div>
        
        <div class="attendance-scroll-list">
    `;

    // B. Hiển thị danh sách cầu thủ điểm danh (Chỉ Admin mới có quyền bấm trực tiếp hàng loạt)
    lineupPlayers.forEach(p => {
        const isGoing = p.attendance_status === 'going';
        const isLate = p.attendance_status === 'late';
        const isAbsent = p.attendance_status === 'absent';
        const isNoResponse = p.attendance_status === 'no_response';

        let btnGroup = '';
        if (isLoggedIn) {
            btnGroup = `
                <div class="attendance-actions" data-player-id="${p.id}">
                    <button class="att-btn going ${isGoing ? 'active' : ''}" onclick="updatePlayerAttendance(${p.id}, 'going')" title="Đi đá"><i class="fa-solid fa-check"></i></button>
                    <button class="att-btn late ${isLate ? 'active' : ''}" onclick="updatePlayerAttendance(${p.id}, 'late')" title="Đi muộn"><i class="fa-solid fa-clock"></i></button>
                    <button class="att-btn absent ${isAbsent ? 'active' : ''}" onclick="updatePlayerAttendance(${p.id}, 'absent')" title="Vắng"><i class="fa-solid fa-xmark"></i></button>
                    <button class="att-btn no-response ${isNoResponse ? 'active' : ''}" onclick="updatePlayerAttendance(${p.id}, 'no_response')" title="Chưa phản hồi"><i class="fa-solid fa-question"></i></button>
                </div>
            `;
        } else {
            let statusText = 'Chưa rep';
            let statusClass = 'no-response';
            if (isGoing) { statusText = 'Đi đá'; statusClass = 'going'; }
            else if (isLate) { statusText = 'Đi trễ'; statusClass = 'late'; }
            else if (isAbsent) { statusText = 'Vắng mặt'; statusClass = 'absent'; }
            
            btnGroup = `<span class="badge-status ${statusClass}" style="font-size:0.75rem; padding:2px 8px;">${statusText}</span>`;
        }

        const avatar = p.avatar_url || 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=100&q=80';

        attendanceHTML += `
            <div class="attendance-row">
                <div class="attendance-player-info">
                    <img src="${avatar}" class="attendance-avatar" alt="${p.name}">
                    <div class="attendance-name-wrapper">
                        <span style="font-weight:600; font-size:0.9rem;">${p.name}</span>
                        <span class="attendance-shirt-num">Áo số: ${p.shirt_number || 'Chưa có'} | ${p.position}</span>
                        ${p.attendance_note ? `<small style="color:var(--accent-warning); font-size:0.75rem;"><i class="fa-solid fa-circle-info"></i> ${p.attendance_note}</small>` : ''}
                        ${isLoggedIn && (isLate || isAbsent) ? `
                            <input type="text" class="att-note-input" data-player-id="${p.id}" value="${p.attendance_note || ''}" placeholder="Lý do..." onchange="updatePlayerAttendanceNote(${p.id}, this.value)">
                        ` : ''}
                    </div>
                </div>
                ${btnGroup}
            </div>
        `;
    });

    attendanceHTML += `
            </div>
            ${isLoggedIn ? `
                <button type="button" class="btn-primary" onclick="submitAdminAttendance(${matchId})" style="margin-top:15px; justify-content:center;">
                    <i class="fa-solid fa-clipboard-check"></i> Lưu tất cả điểm danh (Admin)
                </button>
            ` : ''}
        </div>
    `;

    // 2. Tạo HTML cho cột bên phải (Sa bàn chiến thuật)
    let tacticsHTML = `
        <div class="glass-panel tactics-card" style="padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <h3 style="font-family:'Outfit';"><i class="fa-solid fa-futbol" style="color:var(--accent-primary)"></i> Sa Bàn Sơ Đồ Chiến Thuật</h3>
                
                <div style="display:flex; gap:10px; align-items:center;">
                    <!-- Dropdown chọn loại sân -->
                    <select id="pitch-type-select" class="form-control" style="width:100px; padding:6px 10px; font-size:0.85rem;" onchange="changePitchType(this.value)">
                        <option value="7" ${activeLineup.pitch_type === '7' ? 'selected' : ''}>Sân 7</option>
                        <option value="11" ${activeLineup.pitch_type === '11' ? 'selected' : ''}>Sân 11</option>
                    </select>
                    
                    <!-- Dropdown chọn sơ đồ chiến thuật -->
                    <select id="formation-select" class="form-control" style="width:120px; padding:6px 10px; font-size:0.85rem;" onchange="applyFormation(this.value)">
                        <!-- Sẽ tự động nạp option bằng JS -->
                    </select>
                </div>
            </div>

            <div class="lineup-instructions">
                <p><strong><i class="fa-solid fa-circle-info"></i> Hướng dẫn sắp xếp sa bàn:</strong></p>
                <p>1. Chỉ những cầu thủ ở trạng thái 🟢 <strong>Đi đá</strong> hoặc 🟡 <strong>Đi trễ</strong> mới có thể xếp lên sân.</p>
                <p>2. ${isLoggedIn ? '<strong>Kéo - Thả</strong> cầu thủ từ băng ghế dự bị vào sân hoặc kéo trực tiếp cầu thủ trên sân để di chuyển.' : 'Xem sơ đồ ra sân chính thức được huấn luyện viên/Admin sắp xếp.'}</p>
                <p>3. Trên điện thoại/máy tính bảng: ${isLoggedIn ? '<strong>Bấm vào một cầu thủ</strong> ở băng ghế dự bị hoặc trên sân, sau đó <strong>bấm vào vị trí trên sân cỏ</strong> để xếp hoặc di chuyển.' : 'Sơ đồ được cập nhật trực tuyến.'}</p>
            </div>

            <!-- Khung Sân Bóng Đá -->
            <div class="pitch-wrapper" id="football-pitch">
                <div class="pitch-center-line"></div>
                <div class="pitch-center-circle"></div>
                <div class="pitch-center-spot"></div>
                <div class="pitch-penalty-area-top"></div>
                <div class="pitch-penalty-area-bottom"></div>
                
                <!-- Các chấm cầu thủ trên sân sẽ được vẽ động bằng JS -->
                <div id="pitch-tokens-container"></div>
            </div>

            <!-- Băng Ghế Dự Bị -->
            <div class="bench-wrapper">
                <div class="bench-title"><i class="fa-solid fa-couch"></i> Băng ghế dự bị (${isLoggedIn ? 'Kéo hoặc bấm cầu thủ để xếp lên sân' : 'Cầu thủ chưa lên sân'})</div>
                <div class="bench-list" id="bench-players-list">
                    <!-- Danh sách cầu thủ dự bị sẽ render động -->
                </div>
            </div>

            ${isLoggedIn ? `
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                    <button class="btn-secondary" onclick="clearPitch()" style="padding:10px 20px;"><i class="fa-solid fa-eraser"></i> Xóa sân</button>
                    <button class="btn-primary" onclick="submitLineupBoard(${matchId})" style="padding:10px 20px;"><i class="fa-solid fa-floppy-disk"></i> Lưu sơ đồ chiến thuật</button>
                </div>
            ` : ''}
        </div>
    `;

    // 3. Ghép nối layout
    container.innerHTML = `
        <div class="lineup-layout">
            ${attendanceHTML}
            ${tacticsHTML}
        </div>
    `;

    // 4. Khởi chạy hiển thị phụ trợ
    initFormationDropdown();
    drawLineupBoard();

    // Lắng nghe sự kiện dropdown chọn tự điểm danh
    const selfSelect = document.getElementById('self-player-select');
    if (selfSelect) {
        selfSelect.addEventListener('change', (e) => {
            const playerId = parseInt(e.target.value);
            if (!playerId) {
                document.getElementById('self-note').style.display = 'none';
                return;
            }
            const player = lineupPlayers.find(p => p.id === playerId);
            if (player) {
                // Đổi trạng thái hiển thị của các nút tự điểm danh
                setSelfStatusBtn(player.attendance_status || 'no_response');
                const noteInput = document.getElementById('self-note');
                noteInput.value = player.attendance_note || '';
                noteInput.style.display = (player.attendance_status === 'late' || player.attendance_status === 'absent') ? 'block' : 'none';
            }
        });
    }
}

/**
 * Điều khiển bật tắt Class Active cho nút bấm tự điểm danh
 */
function setSelfStatusBtn(status) {
    document.querySelectorAll('.self-status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.color = 'var(--text-secondary)';
    });

    const noteInput = document.getElementById('self-note');
    if (noteInput) {
        noteInput.style.display = (status === 'late' || status === 'absent') ? 'block' : 'none';
    }

    const targetBtn = document.querySelector(`.self-status-btn.${status}`);
    if (targetBtn) {
        targetBtn.classList.add('active');
        if (status === 'going') {
            targetBtn.style.background = 'var(--accent-primary)';
            targetBtn.style.color = '#fff';
        } else if (status === 'late') {
            targetBtn.style.background = 'var(--accent-warning)';
            targetBtn.style.color = '#fff';
        } else if (status === 'absent') {
            targetBtn.style.background = 'var(--accent-danger)';
            targetBtn.style.color = '#fff';
        }
    }
}

/**
 * Gửi điểm danh đơn lẻ (Cầu thủ tự điểm danh)
 */
function submitSelfAttendance(matchId) {
    const playerId = parseInt(document.getElementById('self-player-select').value);
    if (!playerId) {
        showToast('Vui lòng chọn tên cầu thủ trước khi điểm danh!', 'warning');
        return;
    }

    const activeBtn = document.querySelector('.self-status-btn.active');
    if (!activeBtn) {
        showToast('Vui lòng chọn trạng thái điểm danh!', 'warning');
        return;
    }

    let status = 'no_response';
    if (activeBtn.classList.contains('going')) status = 'going';
    else if (activeBtn.classList.contains('late')) status = 'late';
    else if (activeBtn.classList.contains('absent')) status = 'absent';

    const note = document.getElementById('self-note').value.trim();

    fetch('api/save_attendance.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            match_id: matchId,
            player_id: playerId,
            status: status,
            note: note
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            // Tải lại view để hiển thị cập nhật mới
            switchView('lineup', 'Sa Bàn Chiến Thuật & Điểm Danh', matchId);
        } else {
            showToast(data.message || 'Lỗi điểm danh', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Đã xảy ra lỗi kết nối!', 'error');
    });
}

/**
 * Admin sửa điểm danh trực tiếp trên UI
 */
function updatePlayerAttendance(playerId, status) {
    const player = lineupPlayers.find(p => p.id === playerId);
    if (player) {
        player.attendance_status = status;
        
        // Nếu chuyển trạng thái không phải đi đá/muộn thì tự động xóa khỏi sân bóng
        if (status !== 'going' && status !== 'late') {
            activeLineup.positions = activeLineup.positions.filter(pos => pos.player_id !== playerId);
        }

        // Vẽ lại giao diện list & sa bàn để cập nhật băng ghế dự bị
        const matchId = activeLineup.match_id;
        refreshAttendanceUI(playerId, status);
        drawLineupBoard();
    }
}

function updatePlayerAttendanceNote(playerId, note) {
    const player = lineupPlayers.find(p => p.id === playerId);
    if (player) {
        player.attendance_note = note;
    }
}

/**
 * Vẽ lại nhanh giao diện Điểm danh cục bộ
 */
function refreshAttendanceUI(playerId, status) {
    const rowActions = document.querySelector(`.attendance-actions[data-player-id="${playerId}"]`);
    if (!rowActions) return;

    rowActions.querySelectorAll('.att-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = rowActions.querySelector(`.att-btn.${status === 'no_response' ? 'no-response' : status}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Hiện/Ẩn ô nhập note
    const parentRow = rowActions.closest('.attendance-row');
    if (parentRow) {
        let noteInput = parentRow.querySelector('.att-note-input');
        if (status === 'late' || status === 'absent') {
            if (!noteInput) {
                const nameWrapper = parentRow.querySelector('.attendance-name-wrapper');
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'att-note-input';
                input.setAttribute('data-player-id', playerId);
                input.placeholder = 'Lý do...';
                input.onchange = (e) => updatePlayerAttendanceNote(playerId, e.target.value);
                nameWrapper.appendChild(input);
            }
        } else {
            if (noteInput) noteInput.remove();
            updatePlayerAttendanceNote(playerId, '');
        }
    }
}

/**
 * Gửi lưu danh sách điểm danh hàng loạt (Admin)
 */
function submitAdminAttendance(matchId) {
    const payload = lineupPlayers.map(p => ({
        player_id: p.id,
        status: p.attendance_status || 'no_response',
        note: p.attendance_note || ''
    }));

    fetch('api/save_attendance.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            match_id: matchId,
            attendances: payload
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            switchView('lineup', 'Sa Bàn Chiến Thuật & Điểm Danh', matchId);
        } else {
            showToast(data.message || 'Lỗi lưu điểm danh', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', 'error');
    });
}

/**
 * Khởi tạo dữ liệu Dropdown Formation dựa theo loại sân
 */
function initFormationDropdown() {
    const formationSelect = document.getElementById('formation-select');
    if (!formationSelect) return;

    const pitchType = activeLineup.pitch_type;
    const formations = Object.keys(formationsConfig[pitchType] || {});
    
    let html = '';
    formations.forEach(f => {
        html += `<option value="${f}" ${activeLineup.formation === f ? 'selected' : ''}>Sơ đồ ${f}</option>`;
    });
    html += `<option value="custom" ${activeLineup.formation === 'custom' ? 'selected' : ''}>Tùy biến tự do</option>`;
    
    formationSelect.innerHTML = html;
}

/**
 * Xử lý đổi Loại Sân (Sân 7 / Sân 11)
 */
function changePitchType(value) {
    activeLineup.pitch_type = value;
    const defaultFormation = Object.keys(formationsConfig[value])[0];
    activeLineup.formation = defaultFormation;
    activeLineup.positions = [];
    
    initFormationDropdown();
    applyFormation(defaultFormation);
}

/**
 * Áp dụng Sơ đồ chiến thuật mẫu (formation)
 */
function applyFormation(value) {
    activeLineup.formation = value;
    
    if (value === 'custom') {
        drawLineupBoard();
        return;
    }

    const pitchType = activeLineup.pitch_type;
    const template = formationsConfig[pitchType][value];
    
    if (!template) return;

    const availablePlayers = lineupPlayers.filter(p => p.attendance_status === 'going' || p.attendance_status === 'late');
    
    activeLineup.positions = [];
    template.forEach((spot, index) => {
        let player_id = null;
        if (index < availablePlayers.length) {
            player_id = availablePlayers[index].id;
        }
        
        activeLineup.positions.push({
            player_id: player_id,
            x: spot.x,
            y: spot.y,
            role: spot.role
        });
    });

    drawLineupBoard();
}

/**
 * Reset xóa tất cả cầu thủ ra khỏi sân
 */
function clearPitch() {
    activeLineup.positions = activeLineup.positions.map(pos => ({
        ...pos,
        player_id: null
    }));
    drawLineupBoard();
}

/**
 * Vẽ Sa bàn & Băng Ghế dự bị
 */
function drawLineupBoard() {
    const tokensContainer = document.getElementById('pitch-tokens-container');
    const benchList = document.getElementById('bench-players-list');
    if (!tokensContainer || !benchList) return;

    tokensContainer.innerHTML = '';
    benchList.innerHTML = '';

    // A. Vẽ các chấm trên sân bóng
    activeLineup.positions.forEach((pos, index) => {
        const player = pos.player_id ? lineupPlayers.find(p => p.id === pos.player_id) : null;
        
        let nodeHTML = '';
        if (player) {
            const avatar = player.avatar_url;
            const content = avatar ? `<img src="${avatar}" class="player-token-avatar" alt="${player.name}">` : `<span class="player-token-no-avatar">${player.shirt_number || ''}</span>`;
            
            const nameParts = player.name.split(' ');
            const shortName = nameParts.length > 2 ? `${nameParts[nameParts.length - 2]} ${nameParts[nameParts.length - 1]}` : player.name;

            nodeHTML = `
                <div class="player-token ${isLoggedIn ? 'draggable' : ''}" 
                     style="left:${pos.x}%; top:${pos.y}%;" 
                     draggable="${isLoggedIn ? 'true' : 'false'}"
                     data-index="${index}"
                     data-player-id="${player.id}"
                     onclick="handlePlayerTokenClick(${player.id}, ${index})"
                     title="${player.name} (${player.position})">
                    ${content}
                    <div class="player-token-label">${player.shirt_number ? `#${player.shirt_number} ` : ''}${shortName}</div>
                    ${isLoggedIn ? `<span style="position:absolute; top:-8px; right:-8px; width:18px; height:18px; border-radius:50%; background:var(--accent-danger); color:#fff; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer; border:1px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.3);" onclick="removePlayerFromSpot(event, ${index})" title="Đưa về dự bị">x</span>` : ''}
                </div>
            `;
        } else {
            nodeHTML = `
                <div class="player-token placeholder" 
                     style="left:${pos.x}%; top:${pos.y}%; background:rgba(255,255,255,0.08); border:2px dashed rgba(255,255,255,0.3); box-shadow:none;" 
                     data-index="${index}"
                     onclick="handlePlaceholderClick(${index})"
                     title="Vị trí trống: ${pos.role}">
                    <span style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:700;">${pos.role}</span>
                </div>
            `;
        }

        tokensContainer.insertAdjacentHTML('beforeend', nodeHTML);
    });

    // B. Vẽ băng ghế dự bị
    const busyPlayerIds = activeLineup.positions.map(p => p.player_id).filter(id => id !== null);
    const benchPlayers = lineupPlayers.filter(p => 
        (p.attendance_status === 'going' || p.attendance_status === 'late') && 
        !busyPlayerIds.includes(p.id)
    );

    if (benchPlayers.length === 0) {
        benchList.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Không còn cầu thủ dự bị (Đã ra sân hết).</span>`;
    } else {
        benchPlayers.forEach(p => {
            const avatar = p.avatar_url || 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=100&q=80';
            const isSelected = selectedPlayerIdForLineup === p.id;
            
            benchList.innerHTML += `
                <div class="bench-player-node ${isLoggedIn ? 'draggable' : ''} ${isSelected ? 'selected' : ''}" 
                     style="${isSelected ? 'border-color:var(--accent-secondary); box-shadow:0 0 10px rgba(59,130,246,0.5);' : ''}"
                     draggable="${isLoggedIn ? 'true' : 'false'}"
                     data-player-id="${p.id}"
                     onclick="handleBenchPlayerClick(${p.id})">
                    <img src="${avatar}" class="bench-player-avatar" alt="${p.name}">
                    <span class="bench-player-shirt">${p.shirt_number ? `#${p.shirt_number}` : 'No'}</span>
                    <span>${p.name}</span>
                </div>
            `;
        });
    }

    if (isLoggedIn) {
        setupDragAndDropEvents();
    }
}

/**
 * Đăng ký sự kiện Drag & Drop chuẩn HTML5
 */
function setupDragAndDropEvents() {
    const pitch = document.getElementById('football-pitch');
    if (!pitch) return;

    document.querySelectorAll('.bench-player-node, .player-token').forEach(el => {
        el.addEventListener('dragstart', (e) => {
            const id = el.getAttribute('data-player-id');
            const index = el.getAttribute('data-index');
            
            e.dataTransfer.setData('text/plain', id);
            if (index !== null) {
                e.dataTransfer.setData('source_index', index);
            }
        });
    });

    pitch.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    pitch.addEventListener('drop', (e) => {
        e.preventDefault();
        
        const playerId = parseInt(e.dataTransfer.getData('text/plain'));
        const sourceIndex = e.dataTransfer.getData('source_index');
        
        if (!playerId) return;

        const rect = pitch.getBoundingClientRect();
        const x = Math.round(Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.min(95, Math.max(5, ((e.clientY - rect.top) / rect.height) * 100)));

        if (sourceIndex !== '') {
            const idx = parseInt(sourceIndex);
            activeLineup.positions[idx].x = x;
            activeLineup.positions[idx].y = y;
            document.getElementById('formation-select').value = 'custom';
            activeLineup.formation = 'custom';
        } else {
            let targetSpotIndex = -1;
            let minDistance = 15;
            
            activeLineup.positions.forEach((pos, idx) => {
                if (pos.player_id === null) {
                    const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        targetSpotIndex = idx;
                    }
                }
            });

            if (targetSpotIndex !== -1) {
                activeLineup.positions[targetSpotIndex].player_id = playerId;
            } else {
                const maxPlayers = parseInt(activeLineup.pitch_type);
                const currentOnPitch = activeLineup.positions.filter(p => p.player_id !== null).length;

                if (currentOnPitch >= maxPlayers) {
                    showToast(`Sân đã đủ tối đa ${maxPlayers} cầu thủ chính thức! Vui lòng rút bớt người trước khi thêm.`, 'warning');
                    return;
                }

                activeLineup.positions.push({
                    player_id: playerId,
                    x: x,
                    y: y,
                    role: 'Pos'
                });
                
                document.getElementById('formation-select').value = 'custom';
                activeLineup.formation = 'custom';
            }
        }

        drawLineupBoard();
    });
}

/**
 * Click vào cầu thủ dự bị ở Bench (Cho di động)
 */
function handleBenchPlayerClick(playerId) {
    if (!isLoggedIn) return;
    
    if (selectedPlayerIdForLineup === playerId) {
        selectedPlayerIdForLineup = null;
    } else {
        selectedPlayerIdForLineup = playerId;
    }
    drawLineupBoard();
}

/**
 * Click vào Placeholder vị trí trống trên sân
 */
function handlePlaceholderClick(index) {
    if (!isLoggedIn || !selectedPlayerIdForLineup) return;

    activeLineup.positions[index].player_id = selectedPlayerIdForLineup;
    selectedPlayerIdForLineup = null;
    drawLineupBoard();
}

/**
 * Click vào cầu thủ đang đứng trên sân
 */
function handlePlayerTokenClick(playerId, index) {
    if (!isLoggedIn) return;

    if (selectedPlayerIdForLineup) {
        const benchPlayerId = selectedPlayerIdForLineup;
        activeLineup.positions[index].player_id = benchPlayerId;
        selectedPlayerIdForLineup = null;
        drawLineupBoard();
    } else {
        selectedPlayerIdForLineup = playerId;
        const pitch = document.getElementById('football-pitch');
        if (pitch) {
            const pitchClickListener = (e) => {
                if (e.target.closest('.player-token')) return;

                const rect = pitch.getBoundingClientRect();
                const x = Math.round(Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)));
                const y = Math.round(Math.min(95, Math.max(5, ((e.clientY - rect.top) / rect.height) * 100)));

                const posIdx = activeLineup.positions.findIndex(p => p.player_id === playerId);
                if (posIdx !== -1) {
                    activeLineup.positions[posIdx].x = x;
                    activeLineup.positions[posIdx].y = y;
                    document.getElementById('formation-select').value = 'custom';
                    activeLineup.formation = 'custom';
                }

                selectedPlayerIdForLineup = null;
                pitch.removeEventListener('click', pitchClickListener);
                drawLineupBoard();
            };
            
            setTimeout(() => {
                pitch.addEventListener('click', pitchClickListener);
            }, 50);
            
            showToast('Đã chọn cầu thủ. Hãy bấm vào một vị trí bất kỳ trên sân bóng để di chuyển cầu thủ đó.', 'success');
        }
    }
}

/**
 * Kick cầu thủ trên sân về dự bị
 */
function removePlayerFromSpot(event, index) {
    event.stopPropagation();
    
    if (activeLineup.formation !== 'custom') {
        activeLineup.positions[index].player_id = null;
    } else {
        activeLineup.positions.splice(index, 1);
    }
    
    drawLineupBoard();
}

/**
 * Gửi lưu Sơ đồ Sa bàn Chiến thuật (Admin)
 */
function submitLineupBoard(matchId) {
    const positionsPayload = activeLineup.positions.filter(pos => pos.player_id !== null);

    fetch('api/save_lineup.php', {
        method: 'POST',
        headers: { 'Content-Type: application/json' },
        body: JSON.stringify({
            match_id: matchId,
            pitch_type: activeLineup.pitch_type,
            formation: activeLineup.formation,
            player_positions: positionsPayload
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            switchView('lineup', 'Sa Bàn Chiến Thuật & Điểm Danh', matchId);
        } else {
            showToast(data.message || 'Lỗi lưu sa bàn', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Đã xảy ra lỗi kết nối máy chủ!', 'error');
    });
}

// Expose các hàm ra đối tượng window toàn cục để gọi được từ inline HTML onclick/onchange (do app.js là ES Module)
window.renderLineup = renderLineup;
window.setSelfStatusBtn = setSelfStatusBtn;
window.submitSelfAttendance = submitSelfAttendance;
window.updatePlayerAttendance = updatePlayerAttendance;
window.updatePlayerAttendanceNote = updatePlayerAttendanceNote;
window.submitAdminAttendance = submitAdminAttendance;
window.changePitchType = changePitchType;
window.applyFormation = applyFormation;
window.clearPitch = clearPitch;
window.submitLineupBoard = submitLineupBoard;
window.handlePlayerTokenClick = handlePlayerTokenClick;
window.handlePlaceholderClick = handlePlaceholderClick;
window.handleBenchPlayerClick = handleBenchPlayerClick;
window.removePlayerFromSpot = removePlayerFromSpot;