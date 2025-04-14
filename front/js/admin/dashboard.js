// 当前页面状态
let currentPage = 'dashboard';
let dashboardData = null;

// 获取统计数据
async function fetchDashboardData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/statistics', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取统计数据失败');
        }

        dashboardData = await response.json();
        return dashboardData;
    } catch (error) {
        console.error('错误:', error);
        alert('获取统计数据失败');
        return null;
    }
}

// 加载仪表盘数据
async function loadDashboard() {
    currentPage = 'dashboard';
    document.querySelector('.main-content h2').textContent = '仪表盘';
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="row g-3 my-2">
            <div class="col-md-3">
                <div class="p-3 bg-primary text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                    <div>
                        <h3 class="fs-2">2</h3>
                        <p class="fs-5">手语总数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="p-3 bg-success text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                    <div>
                        <h3 class="fs-2">11</h3>
                        <p class="fs-5">分类总数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="p-3 bg-info text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                    <div>
                        <h3 class="fs-2">0</h3>
                        <p class="fs-5">用户总数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="p-3 bg-warning text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                    <div>
                        <h3 class="fs-2">0</h3>
                        <p class="fs-5">今日访问</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 获取最新数据并更新
    dashboardData = await fetchDashboardData();
    if (dashboardData && contentArea) {
        contentArea.innerHTML = `
            <div class="row g-3 my-2">
                <div class="col-md-3">
                    <div class="p-3 bg-primary text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                        <div>
                            <h3 class="fs-2">${dashboardData.totalSigns || 2}</h3>
                            <p class="fs-5">手语总数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="p-3 bg-success text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                        <div>
                            <h3 class="fs-2">${dashboardData.totalCategories || 11}</h3>
                            <p class="fs-5">分类总数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="p-3 bg-info text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                        <div>
                            <h3 class="fs-2">${dashboardData.totalUsers || 0}</h3>
                            <p class="fs-5">用户总数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="p-3 bg-warning text-white shadow-sm d-flex justify-content-around align-items-center rounded">
                        <div>
                            <h3 class="fs-2">${dashboardData.todayVisits || 0}</h3>
                            <p class="fs-5">今日访问</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// 加载分类管理页面
async function loadCategories() {
    if (currentPage === 'categories') return;
    currentPage = 'categories';
    document.querySelector('.main-content h2').textContent = '分类管理';
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">分类管理</h5>
                <button class="btn btn-primary" onclick="showAddCategoryModal()">
                    <i class="fas fa-plus"></i> 添加分类
                </button>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>名称</th>
                                <th>描述</th>
                                <th>创建时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="categoryList">
                            <!-- 分类列表将通过JavaScript动态加载 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // 加载分类列表
    await window.loadCategoryList();
}

// 加载手语管理页面
async function loadSigns() {
    if (currentPage === 'signs') return;
    currentPage = 'signs';
    document.querySelector('.main-content h2').textContent = '手语管理';
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">手语管理</h5>
                <button class="btn btn-primary" onclick="showAddSignModal()">
                    <i class="fas fa-plus"></i> 添加手语
                </button>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>关键词</th>
                                <th>分类</th>
                                <th>视频</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="signList">
                            <!-- 手语列表将通过JavaScript动态加载 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // 加载手语列表
    await window.loadSignList();
}

// 加载用户管理页面
async function loadUsers() {
    if (currentPage === 'users') return;
    currentPage = 'users';
    document.querySelector('.main-content h2').textContent = '用户管理';
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">用户管理</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped" id="userTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>注册时间</th>
                                <th>用户类型</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="userList">
                            <!-- 用户列表将通过JavaScript动态加载 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // 加载用户列表
    await window.loadUserList();
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login';
        return;
    }

    // 加载初始页面（仪表盘）
    loadDashboard();

    // 添加侧边栏导航事件监听
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 移除所有活动状态
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            // 添加当前项的活动状态
            e.currentTarget.classList.add('active');

            const page = e.currentTarget.getAttribute('data-page');
            switch (page) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'signs':
                    loadSigns();
                    break;
                case 'categories':
                    loadCategories();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'logout':
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/admin/login';
                    break;
            }
        });
    });
});

// 视频预览功能
function playVideo(videoUrl) {
    const video = document.querySelector(`video[src="${videoUrl}"]`);
    if (video) {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }
}

// 优化视频加载
function optimizeVideoLoading(videoElement) {
    videoElement.preload = 'metadata';
    videoElement.addEventListener('mouseenter', function() {
        this.preload = 'auto';
    });
}

// 加载手语列表
window.loadSigns = async function() {
    if (!Auth.checkAuth()) return;
    
    document.querySelector('.main-content h2').textContent = '手语管理';
    const contentArea = document.getElementById('contentArea');
    
    // 设置手语管理的HTML结构
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">手语管理</h5>
                <button class="btn btn-primary" onclick="showAddSignModal()">
                    <i class="fas fa-plus"></i> 添加手语
                </button>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>关键词</th>
                                <th>分类</th>
                                <th>视频</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="signList">
                            <!-- 手语数据将通过JavaScript动态加载 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await Auth.fetchWithAuth('http://localhost:5000/api/admin/signs');
        if (!response) return;
        
        const signs = await response.json();
        if (!signs) return;
        
        const tbody = document.getElementById('signList');
        tbody.innerHTML = signs.map(sign => `
            <tr>
                <td>${sign.id}</td>
                <td>${sign.keyword}</td>
                <td>${sign.category}</td>
                <td>
                    ${sign.video_url ? `
                        <div class="d-flex align-items-center">
                            <video width="100" height="60" preload="none">
                                <source src="${sign.video_url}" type="video/mp4">
                            </video>
                            <button class="btn btn-sm btn-info ms-2" onclick="playVideo('${sign.video_url}')">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    ` : '无视频'}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editSign(${sign.id})">编辑</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSign(${sign.id})">删除</button>
                </td>
            </tr>
        `).join('');

        // 优化视频加载
        document.querySelectorAll('video').forEach(optimizeVideoLoading);
    } catch (error) {
        console.error('加载手语列表错误:', error);
        alert('加载手语列表失败，请检查网络连接');
    }
}

// 加载分类列表
window.loadCategories = async function() {
    if (!Auth.checkAuth()) return;
    
    document.querySelector('.main-content h2').textContent = '分类管理';
    const contentArea = document.getElementById('contentArea');
    
    // 设置分类管理的HTML结构
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">分类管理</h5>
                <button class="btn btn-primary" onclick="showAddCategoryModal()">
                    <i class="fas fa-plus"></i> 添加分类
                </button>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>名称</th>
                                <th>描述</th>
                                <th>创建时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="categoryList">
                            <!-- 分类数据将通过JavaScript动态加载 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await Auth.fetchWithAuth('http://localhost:5000/api/admin/categories');
        if (!response) return;
        
        const categories = await response.json();
        if (!categories) return;
        
        const tbody = document.getElementById('categoryList');
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>${category.id}</td>
                <td>${category.name}</td>
                <td>${category.description || ''}</td>
                <td>${category.created_at || ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${category.id})">编辑</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载分类列表错误:', error);
        alert('加载分类列表失败，请检查网络连接');
    }
}

// 退出登录
document.getElementById('logout').addEventListener('click', function(e) {
    e.preventDefault();
    Auth.logout();
}); 