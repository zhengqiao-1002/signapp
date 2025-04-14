// 加载用户列表
window.loadUserList = async function() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('获取用户列表失败');
        }

        const users = await response.json();
        const tbody = document.getElementById('userList');
        if (!tbody) {
            console.error('找不到用户列表容器');
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${new Date(user.created_at).toLocaleString()}</td>
                <td><span class="badge ${user.user_type === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.user_type === 'admin' ? '管理员' : '普通用户'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editUser(${user.id})">编辑</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('错误:', error);
        alert('加载用户列表失败');
    }
}

// 显示编辑用户模态框
async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }

        const user = await response.json();
        
        // 填充表单数据
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editUserType').value = user.user_type;
        
        // 清空密码字段
        document.getElementById('editPassword').value = '';
        document.getElementById('editConfirmPassword').value = '';
        
        // 如果是当前用户，禁用用户类型选择
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser && currentUser.id === user.id) {
            document.getElementById('editUserType').disabled = true;
            document.getElementById('userTypeHint').style.display = 'block';
        } else {
            document.getElementById('editUserType').disabled = false;
            document.getElementById('userTypeHint').style.display = 'none';
        }
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    } catch (error) {
        console.error('错误:', error);
        alert('获取用户信息失败');
    }
}

// 提交编辑用户
async function submitEditUser() {
    try {
        const userId = document.getElementById('editUserId').value;
        const email = document.getElementById('editEmail').value;
        const password = document.getElementById('editPassword').value;
        const confirmPassword = document.getElementById('editConfirmPassword').value;
        const userType = document.getElementById('editUserType').value;

        // 验证必填字段
        if (!email) {
            alert('邮箱为必填项');
            return;
        }

        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入有效的邮箱地址');
            return;
        }

        // 验证密码
        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                alert('两次输入的密码不一致');
                return;
            }
            if (password.length < 6) {
                alert('密码长度不能少于6个字符');
                return;
            }
        }

        // 准备要发送的数据
        const data = {
            email: email
        };

        // 如果输入了新密码，添加到请求数据中
        if (password) {
            data.password = password;
        }

        // 获取当前用户信息
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        // 设置用户类型（只有在编辑其他用户时才包含）
        if (currentUser && parseInt(userId) !== currentUser.id) {
            data.user_type = userType;
        }

        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '更新用户信息失败');
        }

        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        modal.hide();

        // 重新加载用户列表
        await loadUserList();

        // 如果修改的是当前用户，更新localStorage中的用户信息
        if (currentUser && parseInt(userId) === currentUser.id) {
            currentUser.email = email;
            localStorage.setItem('user', JSON.stringify(currentUser));
        }

        alert('更新成功');
    } catch (error) {
        console.error('错误:', error);
        alert(error.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    // 检查是否是当前用户
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser && currentUser.id === parseInt(userId)) {
        alert('不能删除当前登录的用户');
        return;
    }

    if (!confirm('确定要删除这个用户吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('删除用户失败');
        }

        // 重新加载用户列表
        await loadUserList();
        alert('删除成功');
    } catch (error) {
        console.error('错误:', error);
        alert(error.message);
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 如果当前页面是用户管理页面，加载用户列表
    if (document.querySelector('.main-content h2').textContent === '用户管理') {
        loadUserList();
    }
}); 