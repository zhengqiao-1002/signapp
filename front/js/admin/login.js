document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const success = await Auth.login(username, password);
        if (success) {
            window.location.href = '/admin/dashboard';
        } else {
            alert('登录失败：用户名或密码错误');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('登录失败：请检查网络连接');
    }
}); 