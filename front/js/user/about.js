// 检查登录状态
function checkLogin() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/user/login.html';
        return;
    }
    
    // 显示用户名
    const username = localStorage.getItem('username');
    document.getElementById('username').textContent = username;
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/user/login.html';
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
}); 