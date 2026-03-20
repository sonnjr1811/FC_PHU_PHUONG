// js/modules/api.js
export async function fetchFullData() {
    try {
        const res = await fetch('api/get_all.php');
        if (!res.ok) throw new Error("Lỗi kết nối server");
        return await res.json();
    } catch (e) {
        console.error("Lỗi:", e);
        return { isAdmin: false, players: [], matches: [], funds: { balance: 0, transactions: [] }, album: [], notices: [] };
    }
}

export async function handleLogout() {
    if (confirm("Bạn muốn đăng xuất khỏi quyền quản trị?")) {
        await fetch('api/logout.php');
        location.reload();
    }
}