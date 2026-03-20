// js/app.js
import { fetchFullData } from './modules/api.js';
import { updateAuthUI } from './modules/ui.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderPlayers } from './modules/players.js';
import { renderSettings } from './modules/settings.js';
import { renderMatches } from './modules/matches.js';
import { renderFunds } from './modules/funds.js';
import { renderAlbum } from './modules/album.js';
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form-submit");

    console.log("FORM:", form); // 🔥 debug

    if (!form) {
        console.error("KHÔNG TÌM THẤY FORM LOGIN");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        console.log("CLICK LOGIN"); // 🔥

        const username = document.getElementById("login-user").value;
        const password = document.getElementById("login-pass").value;

        try {
            const res = await fetch("./api/login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            console.log("STATUS:", res.status);

            const text = await res.text();
            console.log("RAW:", text);

            const data = JSON.parse(text);

            if (!data.success) {
                alert(data.message);
                return;
            }

            alert("Đăng nhập thành công!");

            document.getElementById("login-modal").classList.remove("active");

            location.reload();

        } catch (err) {
            console.error("LỖI:", err);
        }
    });
});
async function init() {
    const data = await fetchFullData();
    updateAuthUI(data.isAdmin);

    // Xử lý Menu Click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');

            if (view === 'dashboard') renderDashboard();
            if (view === 'players') renderPlayers();
            if (view === 'settings') renderSettings();
            if (view === 'matches') renderMatches();
            if (view === 'funds') renderFunds();
            if (view === 'album') renderAlbum();
        };
    });

    renderDashboard(); // Khởi tạo trang đầu tiên
}

init();
// LOGIN
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form-submit");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.getElementById("login-user").value;
            const password = document.getElementById("login-pass").value;

            try {
                const res = await fetch("api/login.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.message);
                }

                alert("Đăng nhập thành công!");

                // đóng modal
                document.getElementById("login-modal").classList.remove("active");

                // reload để cập nhật giao diện
                location.reload();

            } catch (err) {
                console.error(err);
                alert(err.message || "Lỗi đăng nhập");
            }
        });
    }
});
// CHECK LOGIN
async function checkLogin() {
    const res = await fetch("api/check_login.php");
    const data = await res.json();

    if (data.logged_in) {
        console.log("Đã đăng nhập:", data.user);
        // bạn có thể hiện nút admin ở đây
    }
}

checkLogin();

async function logout() {
    await fetch("api/logout.php");
    location.reload();
}