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
        // 获取学习记录，筛选出已完成的手语数量
        const learningResponse = await fetch('/api/user/learning', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const progressList = await learningResponse.json();
        const completedCount = progressList.filter(item => item.status === 'completed').length;
        
        // 更新已学手语数量为已完成的手语数量
        document.getElementById('totalSigns').textContent = completedCount;
        
        // 获取其他统计数据
        const response = await fetch('/api/user/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const stats = await response.json();
        
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
        
        if (favorites.length === 0) {
            container.innerHTML = '<div class="no-favorites">您还没有收藏任何手语</div>';
            return;
        }
        
        // 保存当前滚动位置
        const scrollPosition = container.scrollTop;
        
        // 分批次加载视频，减轻一次性加载的压力
        const batchSize = 12; // 每批次加载的数量
        const totalBatches = Math.ceil(favorites.length / batchSize);
        
        // 生成HTML
        container.innerHTML = favorites.map((sign, index) => `
            <div class="favorite-card" data-id="${sign.id}">
                <div class="favorite-indicator">❤</div>
                <video class="favorite-video" src="${sign.video_url}" preload="none" poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="></video>
                <div class="favorite-info">
                    <h3>${sign.keyword}</h3>
                    <p>${sign.category}</p>
                </div>
                <div class="favorite-actions">
                    <button class="action-btn play" onclick="playVideo('${sign.video_url}')">播放</button>
                    <button class="action-btn remove" onclick="removeFavorite(${sign.id})">取消收藏</button>
                </div>
            </div>
        `).join('');
        
        // 恢复滚动位置
        container.scrollTop = scrollPosition;
        
        // 懒加载视频预览
        const lazyLoadVideos = () => {
            const videos = container.querySelectorAll('video');
            const inViewport = Array.from(videos).filter(video => {
                const rect = video.getBoundingClientRect();
                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );
            });
            
            inViewport.forEach(video => {
                if (video.getAttribute('preload') === 'none') {
                    video.setAttribute('preload', 'metadata');
                }
            });
        };
        
        // 初始加载视频预览
        lazyLoadVideos();
        
        // 滚动时加载视频预览
        container.addEventListener('scroll', lazyLoadVideos);
        
        // 为视频添加鼠标悬停时播放的效果
        const videos = container.getElementsByTagName('video');
        Array.from(videos).forEach(video => {
            video.addEventListener('mouseover', function() {
                // 只有在视频准备好的情况下才播放
                if (this.readyState >= 2) {
                    this.play();
                } else {
                    // 如果视频未加载，先加载然后播放
                    this.setAttribute('preload', 'auto');
                    this.load();
                    this.addEventListener('loadeddata', function onLoaded() {
                        this.play();
                        this.removeEventListener('loadeddata', onLoaded);
                    });
                }
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

// 加载学习进度
async function loadLearningProgress() {
    try {
        const response = await fetch('/api/user/learning', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const progressList = await response.json();
        
        const container = document.getElementById('learningProgress');
        
        if (!container) return; // 如果容器不存在，直接返回
        
        if (progressList.length === 0) {
            container.innerHTML = '<div class="no-progress">您还没有学习记录</div>';
            return;
        }
        
        // 获取总手语数量
        const totalSignsResponse = await fetch('/api/signs/count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => ({ json: async () => ({ count: 0 }) }));
        
        const totalSignsData = await totalSignsResponse.json();
        const totalSigns = totalSignsData.count || 100; // 如果API不存在，使用默认值100
        
        // 按状态分组
        const completed = progressList.filter(item => item.status === 'completed');
        const learning = progressList.filter(item => item.status === 'learning');
        
        // 计算进度百分比 - 修正计算方式，只用已完成的除以总数
        const completedPercent = Math.round((completed.length / totalSigns) * 100);
        const learningPercent = Math.round((learning.length / totalSigns) * 100);
        
        // 生成简洁的进度显示，修复标签文本
        container.innerHTML = `
            <div class="progress-summary">
                <div class="progress-stat">
                    <span class="progress-count">${completed.length}</span>
                    <span class="progress-label">已完成</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-count">${learning.length}</span>
                    <span class="progress-label">学习中</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-count">${totalSigns}</span>
                    <span class="progress-label">总手语</span>
                </div>
            </div>
            
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${completedPercent}%"></div>
            </div>
            
            <div class="progress-details">
                <div class="progress-percentage">${completedPercent}% 完成</div>
                <div class="progress-numbers">${completed.length}/${totalSigns}</div>
            </div>
            
            <!-- 添加学习中的手语列表 -->
            ${learning.length > 0 ? `
            <div class="learning-list-container">
                <h3>正在学习的手语</h3>
                <div class="learning-list">
                    ${learning.map(item => `
                        <div class="learning-item">
                            <span class="learning-keyword">${item.keyword || '未命名手语'}</span>
                            <div class="learning-actions">
                                <button class="action-btn play" onclick="playVideo('${item.video_url || '#'}')">播放</button>
                                <button class="action-btn remove" onclick="cancelLearning(${item.id})">取消学习</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('加载学习进度失败:', error);
    }
}

// 获取状态文本
function getStatusText(status) {
    switch(status) {
        case 'not_started': return '未开始';
        case 'learning': return '学习中';
        case 'completed': return '已完成';
        default: return status;
    }
}

// 播放视频
function playVideo(videoUrl) {
    const videoModal = document.createElement('div');
    videoModal.className = 'video-modal';
    videoModal.innerHTML = `
        <div class="video-container">
            <video src="${videoUrl}" controls autoplay></video>
            <button class="close-modal">关闭</button>
        </div>
    `;
    document.body.appendChild(videoModal);
    
    // 绑定关闭按钮事件
    videoModal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(videoModal);
    });
}

// 练习手语
async function practiceSign(signId) {
    try {
        // 获取手语视频URL
        const response = await fetch(`/api/signs/${signId}/video`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取视频失败');
        }
        
        const data = await response.json();
        
        // 更新学习进度
        await fetch(`/api/user/learning/${signId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'learning' })
        });
        
        // 播放视频
        playVideo(data.videoUrl);
        
    } catch (error) {
        console.error('练习手语失败:', error);
        alert('视频加载失败，请重试');
    }
}

// 切换收藏列表视图
function toggleView(viewType) {
    const container = document.getElementById('favoritesContainer');
    const buttons = document.querySelectorAll('.view-btn');
    
    // 保存当前滚动位置
    const scrollPosition = container.scrollTop;
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewType) {
            btn.classList.add('active');
        }
    });
    
    // 切换视图类名
    container.className = `favorites-container ${viewType}-view`;
    
    // 强制重新计算布局，确保滚动条显示
    container.style.display = 'none';
    setTimeout(() => {
        container.style.display = '';
        
        // 恢复滚动位置
        container.scrollTop = 0;
        
        // 为确保滚动条能在列表视图中显示，添加最小内容高度检查
        if (viewType === 'list-view') {
            const cards = container.querySelectorAll('.favorite-card');
            if (cards.length > 5) { // 如果项目多于5个，强制设置最小内容高度
                container.style.minHeight = '550px';
            }
        } else {
            container.style.minHeight = '';
        }
    }, 50);
    
    // 保存当前视图类型到本地存储
    localStorage.setItem('favoritesViewType', viewType);
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

// 取消学习状态
async function cancelLearning(signId) {
    try {
        if (!confirm('确定要取消该手语的学习状态吗？')) {
            return;
        }
        
        // 修改为POST请求并标记状态为'not_started'
        const response = await fetch(`/api/user/learning/${signId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'not_started' })
        });
        
        if (response.ok) {
            // 重新加载学习记录和进度
            loadLearningProgress();
            loadLearningStats();
            alert('已取消学习状态');
        } else {
            throw new Error('操作失败');
        }
    } catch (error) {
        console.error('取消学习状态失败:', error);
        alert('操作失败，请重试');
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
    loadLearningProgress();
    
    // 恢复上次选择的视图类型
    const savedViewType = localStorage.getItem('favoritesViewType');
    if (savedViewType) {
        toggleView(savedViewType);
    }
    
    // 绑定视图切换按钮事件
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });
    
    // 绑定刷新按钮事件
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshData);
    }
});

// 刷新所有数据
function refreshData() {
    const refreshButton = document.getElementById('refreshButton');
    
    // 添加旋转动画
    refreshButton.classList.add('rotating');
    refreshButton.disabled = true;
    
    // 刷新所有数据
    Promise.all([
        loadLearningStats(),
        loadFavorites(),
        loadLearningProgress()
    ]).then(() => {
        // 显示成功提示
        alert('数据已刷新');
    }).catch(error => {
        console.error('刷新数据失败:', error);
        alert('刷新失败，请重试');
    }).finally(() => {
        // 移除旋转动画
        setTimeout(() => {
            refreshButton.classList.remove('rotating');
            refreshButton.disabled = false;
        }, 500);
    });
} 