// 认证管理模块
const Auth = {
    // Token 相关操作
    getToken() {
        return localStorage.getItem('token');
    },

    setToken(token) {
        localStorage.setItem('token', token);
    },

    removeToken() {
        localStorage.removeItem('token');
    },

    // 用户类型相关操作
    getUserType() {
        return localStorage.getItem('userType');
    },

    setUserType(type) {
        localStorage.setItem('userType', type);
    },

    removeUserType() {
        localStorage.removeItem('userType');
    },

    // 检查是否已登录且是管理员
    isAdmin() {
        const token = this.getToken();
        const userType = this.getUserType();
        return token && userType === 'admin';
    },

    // 检查认证状态
    checkAuth() {
        if (!this.isAdmin()) {
            this.logout();
            return false;
        }
        return true;
    },

    // 登录处理
    async login(username, password) {
        try {
            const response = await fetch('http://localhost:5000/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.setToken(data.token);
                this.setUserType(data.user.user_type);
                // 保存用户信息
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    },

    // 登出处理
    logout() {
        this.removeToken();
        this.removeUserType();
        window.location.href = '/admin/login';
    },

    // 刷新 token
    async refreshToken() {
        try {
            const response = await fetch('http://localhost:5000/api/admin/refresh-token', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.setToken(data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    },

    // 带认证的 API 请求
    async fetchWithAuth(url, options = {}) {
        if (!this.checkAuth()) return null;

        const token = this.getToken();
        if (!token) {
            this.logout();
            return null;
        }

        // 检查是否是文件上传
        const isFormData = options.body instanceof FormData;
        
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            // 如果是 FormData，不设置 Content-Type，让浏览器自动处理
            ...(!isFormData && { 'Content-Type': 'application/json' })
        };

        try {
            // 根据是否是文件上传设置不同的超时时间
            const timeoutDuration = isFormData ? 300000 : 30000; // 文件上传 5 分钟，普通请求 30 秒

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...(options.headers || {})
                },
                // 添加超时处理
                signal: AbortSignal.timeout(timeoutDuration)
            });
            
            if (response.status === 401) {
                // 尝试刷新 token
                if (await this.refreshToken()) {
                    // 使用新 token 重试请求
                    const newToken = this.getToken();
                    return await fetch(url, {
                        ...options,
                        headers: {
                            ...defaultHeaders,
                            ...(options.headers || {}),
                            'Authorization': `Bearer ${newToken}`
                        },
                        signal: AbortSignal.timeout(timeoutDuration)
                    });
                }
                this.logout();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API request error:', error);
            // 区分不同类型的错误
            if (error.name === 'TimeoutError') {
                alert(isFormData ? '文件上传超时，请检查网络连接或尝试上传小一点的文件' : '请求超时，请检查网络连接或稍后重试');
            } else if (error.name === 'AbortError') {
                alert('请求被中断，请重试');
            } else {
                alert('网络错误，请检查连接');
            }
            return null;
        }
    }
};

// 导出 Auth 对象
window.Auth = Auth; 