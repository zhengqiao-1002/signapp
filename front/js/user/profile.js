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

// 加载用户信息
async function loadUserProfile() {
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const userData = await response.json();
        
        document.getElementById('profileUsername').textContent = userData.username;
        document.getElementById('profileEmail').textContent = userData.email;
        document.getElementById('profileCreatedAt').textContent = new Date(userData.created_at).toLocaleString();
    } catch (error) {
        console.error('加载用户信息失败:', error);
    }
}

// 加载学习统计
async function loadLearningStats() {
    try {
        const response = await fetch('/api/user/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const stats = await response.json();
        
        document.getElementById('totalSigns').textContent = stats.total_signs || 0;
        document.getElementById('favoriteSigns').textContent = stats.favorite_signs || 0;
        document.getElementById('learningDays').textContent = stats.learning_days || 0;
    } catch (error) {
        console.error('加载学习统计失败:', error);
    }
}

// 加载收藏的手语
async function loadFavorites() {
    try {
        const response = await fetch('/api/user/favorites', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const favorites = await response.json();
        
        const container = document.getElementById('favoritesContainer');
        container.innerHTML = favorites.map(sign => `
            <div class="favorite-card">
                <video class="favorite-video" src="${sign.video_url}" preload="metadata"></video>
                <div class="favorite-info">
                    <h3>${sign.keyword}</h3>
                    <p>${sign.category}</p>
                </div>
                <div class="favorite-actions">
                    <button class="action-btn remove" onclick="removeFavorite(${sign.id})">取消收藏</button>
                </div>
            </div>
        `).join('');
        
        // 为视频添加鼠标悬停时播放的效果
        const videos = container.getElementsByTagName('video');
        Array.from(videos).forEach(video => {
            video.addEventListener('mouseover', function() {
                this.play();
            });
            video.addEventListener('mouseout', function() {
                this.pause();
                this.currentTime = 0;
            });
        });
    } catch (error) {
        console.error('加载收藏失败:', error);
    }
}

// 加载最近学习的手语
async function loadRecentSigns() {
    try {
        const response = await fetch('/api/user/recent-signs', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const recentSigns = await response.json();
        
        const container = document.getElementById('recentSigns');
        container.innerHTML = recentSigns.map(sign => `
            <div class="recent-card">
                <h3>${sign.keyword}</h3>
                <p>最近练习: ${new Date(sign.last_practiced).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载最近学习记录失败:', error);
    }
}

// 切换收藏列表视图
function toggleView(viewType) {
    const container = document.getElementById('favoritesContainer');
    const buttons = document.querySelectorAll('.view-btn');
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewType) {
            btn.classList.add('active');
        }
    });
    
    container.className = `favorites-container ${viewType}-view`;
}

// 取消收藏
async function removeFavorite(signId) {
    try {
        const response = await fetch(`/api/user/favorites/${signId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 重新加载收藏列表和统计数据
            loadFavorites();
            loadLearningStats();
        }
    } catch (error) {
        console.error('取消收藏失败:', error);
    }
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
    loadUserProfile();
    loadLearningStats();
    loadFavorites();
    loadRecentSigns();
    
    // 绑定视图切换按钮事件
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });
}); 