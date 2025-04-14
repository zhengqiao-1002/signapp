document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const alertPlaceholder = document.getElementById('alertPlaceholder');

    // 显示提示信息
    function showAlert(message, type) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
            `   <div>${message}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join('');
        
        alertPlaceholder.innerHTML = '';
        alertPlaceholder.append(wrapper);
    }

    // 验证密码强度
    function validatePassword(password) {
        const minLength = 6;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        if (password.length < minLength) {
            return '密码长度至少为6个字符';
        }
        if (!hasLetter || !hasNumber) {
            return '密码必须包含字母和数字';
        }
        return null;
    }

    // 处理表单提交
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 获取提交按钮
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 基本验证
        if (!username || !email || !password || !confirmPassword) {
            showAlert('请填写所有必填字段', 'danger');
            return;
        }

        // 验证用户名长度
        if (username.length < 3) {
            showAlert('用户名至少需要3个字符', 'danger');
            return;
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('请输入有效的邮箱地址', 'danger');
            return;
        }

        // 验证密码
        const passwordError = validatePassword(password);
        if (passwordError) {
            showAlert(passwordError, 'danger');
            return;
        }

        // 验证密码匹配
        if (password !== confirmPassword) {
            showAlert('两次输入的密码不一致', 'danger');
            return;
        }

        try {
            // 禁用提交按钮
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 注册中...';

            // 发送注册请求
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('注册成功！正在跳转到登录页面...', 'success');
                // 延迟2秒后跳转到登录页面
                setTimeout(() => {
                    window.location.href = '/user/login';
                }, 2000);
            } else {
                throw new Error(data.message || '注册失败，请稍后重试');
            }
        } catch (error) {
            showAlert(error.message, 'danger');
            // 恢复提交按钮
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    // 实时密码验证
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    function validatePasswordMatch() {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('密码不匹配');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    }

    passwordInput.addEventListener('input', validatePasswordMatch);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
}); 