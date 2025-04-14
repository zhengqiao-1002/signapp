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

// 搜索手语关键词
async function searchSignLanguage(text) {
    try {
        const response = await fetch(`/api/signs/search?keyword=${encodeURIComponent(text)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '搜索失败');
        }
        
        // 如果有消息，显示给用户
        if (data.message) {
            displayResult(data.message);
        }
        
        return data;
    } catch (error) {
        console.error('搜索出错:', error);
        displayResult(error.message || '搜索失败，请稍后重试');
        return null;
    }
}

// 显示关键词列表
function displayKeywords(keywords) {
    const keywordsList = document.getElementById('keywordsList');
    if (!keywords || keywords.length === 0) {
        keywordsList.innerHTML = '<div class="no-results">暂无匹配的手语</div>';
        return;
    }
    
    keywordsList.innerHTML = keywords.map(keyword => `
        <div class="keyword-item" onclick="playSignVideo('${keyword.id}', '${keyword.text}')">
            ${keyword.text}
        </div>
    `).join('');
}

// 显示识别结果
function displayResult(text) {
    const resultContent = document.getElementById('recognitionResult');
    resultContent.textContent = text;
}

// 播放手语视频
async function playSignVideo(signId, keyword) {
    try {
        // 更新选中状态
        const items = document.querySelectorAll('.keyword-item');
        items.forEach(item => {
            if (item.textContent.trim() === keyword) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 获取视频URL
        const response = await fetch(`/api/signs/${signId}/video`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取视频失败');
        }
        
        const data = await response.json();
        const video = document.getElementById('signVideo');
        video.src = data.videoUrl;
        video.play();
    } catch (error) {
        console.error('播放视频失败:', error);
        alert('视频加载失败，请重试');
    }
}

// 处理文本输入
let searchTimeout = null;
function handleTextInput(event) {
    const text = event.target.value.trim();
    
    // 清除之前的定时器
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // 如果是失焦事件且文本为空，不执行搜索
    if (event.type === 'blur' && !text) {
        return;
    }
    
    // 设置新的定时器，防抖处理
    searchTimeout = setTimeout(async () => {
        displayResult(text); // 立即显示输入的文本到右侧
        
        const searchResult = await searchSignLanguage(text);
        if (searchResult && searchResult.signs) {
            displayKeywords(searchResult.signs);
            
            // 如果只有一个结果，自动播放视频
            if (searchResult.signs.length === 1) {
                const sign = searchResult.signs[0];
                playSignVideo(sign.id, sign.text);
            }
        }
    }, 500); // 500ms 的防抖延迟
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    
    // 绑定文本输入事件
    const textInput = document.getElementById('textInput');
    textInput.addEventListener('blur', handleTextInput);
    textInput.addEventListener('input', handleTextInput);
}); 