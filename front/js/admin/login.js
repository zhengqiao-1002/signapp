document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const alertPlaceholder = document.getElementById('alertPlaceholder');
    
    try {
        // 使用 Auth 模块进行登录
        await Auth.login(username, password);
        
        // 显示成功消息
        showAlert('登录成功！正在跳转...', 'success');
        
        // 延迟跳转到管理员仪表盘
        setTimeout(() => {
            window.location.href = '/admin/dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || '登录失败，请检查用户名和密码', 'danger');
    }
});

function showAlert(message, type) {
    const alertPlaceholder = document.getElementById('alertPlaceholder');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');
    
    alertPlaceholder.innerHTML = '';
    alertPlaceholder.append(wrapper);
} 