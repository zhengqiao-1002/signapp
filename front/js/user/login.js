// API基础URL配置
const API_BASE_URL = 'http://localhost:5000';

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // 验证输入
    if (!username || !password) {
        showAlert('用户名和密码不能为空', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('userType', data.user.user_type);
            localStorage.setItem('username', data.user.username);
            
            // 显示成功消息
            showAlert('登录成功！正在跳转...', 'success');
            
            // 延迟跳转到首页
            setTimeout(() => {
                window.location.href = '/user/index.html';
            }, 1500);
        } else {
            showAlert(data.message || '登录失败，请检查用户名和密码', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('登录失败，请稍后重试', 'danger');
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