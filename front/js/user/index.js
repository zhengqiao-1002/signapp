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
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/user/login.html';
            return;
        }

        const response = await fetch(`/api/signs/search?keyword=${encodeURIComponent(text)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            // 如果token无效，重定向到登录页面
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/user/login.html';
            return;
        }
        
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
        <div class="keyword-item" data-id="${keyword.id}" onclick="playSignVideo('${keyword.id}', '${keyword.text}')">
            ${keyword.text}
        </div>
    `).join('');
}

// 显示识别结果（不带标点符号）
function displayResult(text) {
    const resultContent = document.getElementById('recognitionResult');
    // 移除所有标点符号
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    resultContent.textContent = cleanText;
}

// 播放手语视频
async function playSignVideo(signId, keyword) {
    try {
        // 如果摄像头正在使用，先关闭它
        if (isUsingCamera) {
            await stopCamera();
        }
        
        // 显示视频区域
        document.getElementById('videoView').style.display = 'flex';
        document.getElementById('cameraView').style.display = 'none';
        
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
        
        // 检查视频容器是否包含控制按钮，没有则添加
        const videoContainer = document.getElementById('videoContainer');
        if (!document.getElementById('videoControls')) {
            const controls = document.createElement('div');
            controls.id = 'videoControls';
            controls.className = 'video-controls';
            controls.innerHTML = `
                <button id="favoriteButton" class="control-btn" title="收藏">❤</button>
                <button id="completeButton" class="control-btn" title="标记为已学习">✓</button>
            `;
            videoContainer.appendChild(controls);
            
            // 添加收藏按钮点击事件
            document.getElementById('favoriteButton').addEventListener('click', () => {
                toggleFavorite(signId);
            });
            
            // 添加完成学习按钮点击事件
            document.getElementById('completeButton').addEventListener('click', () => {
                markAsCompleted(signId);
            });
        }
        
        // 设置视频源并播放
        video.src = data.videoUrl;
        video.play();
        
        // 更新学习进度
        updateLearningProgress(signId, 'learning');
        
        // 检查是否已收藏，更新按钮状态
        checkFavoriteStatus(signId);
        
        // 自动隐藏无视频时的视频区域
        updateVideoVisibility();
    } catch (error) {
        console.error('播放视频失败:', error);
        alert('视频加载失败，请重试');
        // 失败时也隐藏视频区域
        document.getElementById('videoView').style.display = 'none';
        updateVideoVisibility();
    }
}

// 更新学习进度
async function updateLearningProgress(signId, status) {
    try {
        await fetch(`/api/user/learning/${signId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
    } catch (error) {
        console.error('更新学习进度失败:', error);
    }
}

// 标记为已完成学习
async function markAsCompleted(signId) {
    try {
        await updateLearningProgress(signId, 'completed');
        const completeButton = document.getElementById('completeButton');
        completeButton.classList.add('active');
        completeButton.title = '已学习';
        alert('已标记为学习完成！');
    } catch (error) {
        console.error('标记完成失败:', error);
    }
}

// 切换收藏状态
async function toggleFavorite(signId) {
    try {
        const favoriteButton = document.getElementById('favoriteButton');
        const isFavorited = favoriteButton.classList.contains('active');
        
        if (isFavorited) {
            // 取消收藏
            await fetch(`/api/user/favorites/${signId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            favoriteButton.classList.remove('active');
            favoriteButton.title = '收藏';
            alert('已取消收藏');
        } else {
            // 添加收藏
            await fetch(`/api/user/favorites/${signId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            favoriteButton.classList.add('active');
            favoriteButton.title = '取消收藏';
            alert('收藏成功');
        }
    } catch (error) {
        console.error('操作收藏失败:', error);
        alert('操作失败，请重试');
    }
}

// 检查是否已收藏
async function checkFavoriteStatus(signId) {
    try {
        const response = await fetch('/api/user/favorites', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取收藏列表失败');
        }
        
        const favorites = await response.json();
        const isFavorited = favorites.some(item => item.id === parseInt(signId));
        
        const favoriteButton = document.getElementById('favoriteButton');
        if (isFavorited) {
            favoriteButton.classList.add('active');
            favoriteButton.title = '取消收藏';
        } else {
            favoriteButton.classList.remove('active');
            favoriteButton.title = '收藏';
        }
    } catch (error) {
        console.error('检查收藏状态失败:', error);
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
        const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
        displayResult(cleanText); // 显示无标点的文本
        
        const searchResult = await searchSignLanguage(cleanText);
        if (searchResult && searchResult.signs) {
            displayKeywords(searchResult.signs);
            
            // 如果只有一个结果，自动播放视频
            if (searchResult.signs.length === 1) {
                const sign = searchResult.signs[0];
                playSignVideo(sign.id, sign.text);
            }
        }
    }, 500);
}

// 状态标志
let isUsingCamera = false;
let isRecording = false;
let recognition = null;
let stream = null;

// 初始化语音识别
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';

        recognition.onresult = async function(event) {
            const result = event.results[0][0].transcript;
            // 移除标点符号
            const cleanResult = result.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            displayResult(cleanResult);
            
            // 搜索匹配的手语
            const searchResult = await searchSignLanguage(cleanResult);
            if (searchResult && searchResult.signs) {
                displayKeywords(searchResult.signs);
                
                // 如果只有一个结果，自动播放视频
                if (searchResult.signs.length === 1) {
                    const sign = searchResult.signs[0];
                    playSignVideo(sign.id, sign.text);
                }
            }
        };

        recognition.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            let errorMessage = '语音识别失败，请重试';
            
            switch(event.error) {
                case 'audio-capture':
                    errorMessage = '无法访问麦克风。请检查：\n1. 浏览器的麦克风权限\n2. 系统麦克风是否正常工作\n3. 是否有其他程序占用麦克风';
                    break;
                case 'not-allowed':
                    errorMessage = '麦克风访问被拒绝。请在浏览器设置中允许访问麦克风。';
                    break;
                case 'network':
                    errorMessage = '网络连接出错，请检查网络后重试。';
                    break;
                case 'no-speech':
                    errorMessage = '没有检测到语音，请靠近麦克风后重试。';
                    break;
                case 'service-not-allowed':
                    errorMessage = '该浏览器不支持语音识别服务。';
                    break;
            }
            
            displayResult(errorMessage);
            alert(errorMessage);
        };

        recognition.onend = function() {
            isRecording = false;
            const voiceButton = document.getElementById('voiceInput');
            voiceButton.classList.remove('active');
            voiceButton.textContent = '按住说话';
        };
    } else {
        const voiceButton = document.getElementById('voiceInput');
        voiceButton.style.display = 'none';
        console.error('浏览器不支持语音识别');
        alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器。');
    }
}

// 处理语音输入
function handleVoiceInput() {
    const voiceButton = document.getElementById('voiceInput');
    
    voiceButton.addEventListener('mousedown', async () => {
        if (isUsingCamera) {
            alert('请先关闭摄像头再使用语音识别');
            return;
        }
        
        if (recognition) {
            try {
                // 尝试获取麦克风权限
                await navigator.mediaDevices.getUserMedia({ audio: true });
                
                isRecording = true;
                voiceButton.classList.add('active');
                voiceButton.textContent = '松开结束';
                recognition.start();
            } catch (error) {
                console.error('麦克风访问失败:', error);
                alert('无法访问麦克风，请确保已授予权限并且麦克风正常工作。');
            }
        }
    });

    voiceButton.addEventListener('mouseup', () => {
        if (recognition && isRecording) {
            recognition.stop();
        }
    });

    voiceButton.addEventListener('mouseleave', () => {
        if (recognition && isRecording) {
            recognition.stop();
        }
    });
}

// 启动摄像头
async function startCamera() {
    if (isRecording) {
        alert('请先停止语音识别再开启摄像头');
        return;
    }
    
    const startButton = document.getElementById('startCamera');
    const video = document.getElementById('cameraVideo');
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        video.srcObject = stream;
        isUsingCamera = true;
        startButton.classList.add('active');
        startButton.textContent = '关闭摄像头';
        
        // 显示摄像头视图
        document.getElementById('videoView').style.display = 'none';
        document.getElementById('cameraView').style.display = 'flex';
        
        // 加载并初始化手语识别
        try {
            // 启动手语识别
            if (typeof initHandLandmarker === 'function') {
                await initHandLandmarker();
                console.log('手语识别初始化成功');
                
                // 开始手部跟踪
                if (typeof initHandTracking === 'function') {
                    initHandTracking();
                    console.log('开始手部跟踪');
                    
                    // 显示状态信息
                    const resultElement = document.getElementById('recognitionResult');
                    if (resultElement) {
                        resultElement.textContent = "请做出手语动作...";
                    }
                }
            }
        } catch (error) {
            console.error('手语识别初始化失败:', error);
        }
    } catch (error) {
        console.error('摄像头访问失败:', error);
        alert('无法访问摄像头，请确保已授予权限');
    }
}

// 停止摄像头
async function stopCamera() {
    // 停止手部跟踪
    if (typeof stopHandTracking === 'function') {
        stopHandTracking();
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    const video = document.getElementById('cameraVideo');
    video.srcObject = null;
    
    const startButton = document.getElementById('startCamera');
    startButton.classList.remove('active');
    startButton.textContent = '开启摄像头';
    
    isUsingCamera = false;
    
    // 显示视频视图
    document.getElementById('videoView').style.display = 'none'; // 强制隐藏
    document.getElementById('cameraView').style.display = 'none';
    
    // 清空识别结果
    const resultElement = document.getElementById('recognitionResult');
    if (resultElement) {
        resultElement.textContent = "";
    }
    
    // 清空匹配列表
    const keywordsList = document.getElementById('keywordsList');
    if (keywordsList) {
        keywordsList.innerHTML = '';
    }
    
    // 也执行一次视频可见性更新
    updateVideoVisibility();
}

// 处理摄像头按钮点击
function handleCameraButton() {
    const startButton = document.getElementById('startCamera');
    startButton.addEventListener('click', async () => {
        if (isUsingCamera) {
            await stopCamera();
        } else {
            await startCamera();
        }
    });
}

// 加载MediaPipe库
async function loadMediaPipeLibraries() {
    return new Promise((resolve, reject) => {
        // 检查是否已加载
        if (window.FilesetResolver && window.HandLandmarker && 
            window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
            resolve();
            return;
        }
        
        try {
            // 改为直接使用更可靠的CDN
            // 加载MediaPipe绘图工具
            const drawingUtilsScript = document.createElement('script');
            drawingUtilsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js';
            
            // 加载手部连接数据
            const handsScript = document.createElement('script');
            handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
            
            // 创建一个函数来检查所有库是否已加载
            const checkLibrariesLoaded = () => {
                if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
                    console.log('MediaPipe基础库加载成功');
                    
                    // 使用一个单独的脚本，包含我们自己定义的手部跟踪逻辑
                    const handTrackingScript = document.createElement('script');
                    handTrackingScript.src = '/js/user/sign.js';
                    handTrackingScript.onload = () => {
                        console.log('手语识别脚本加载成功');
                        resolve();
                    };
                    handTrackingScript.onerror = (e) => {
                        console.error('加载手语识别脚本失败:', e);
                        reject(new Error('手语识别脚本加载失败'));
                    };
                    document.body.appendChild(handTrackingScript);
                } else {
                    // 如果库还未加载完成，等待100ms后再检查
                    setTimeout(checkLibrariesLoaded, 100);
                }
            };
            
            // 添加加载事件监听器
            drawingUtilsScript.onload = () => {
                console.log('MediaPipe绘图工具加载成功');
            };
            
            handsScript.onload = () => {
                console.log('MediaPipe手部库加载成功');
                // 在手部库加载后开始检查所有库是否已加载
                checkLibrariesLoaded();
            };
            
            // 错误处理
            drawingUtilsScript.onerror = (e) => {
                console.error('MediaPipe绘图工具加载失败:', e);
                reject(new Error('MediaPipe绘图工具加载失败'));
            };
            
            handsScript.onerror = (e) => {
                console.error('MediaPipe手部库加载失败:', e);
                reject(new Error('MediaPipe手部库加载失败'));
            };
            
            // 添加到文档中
            document.head.appendChild(drawingUtilsScript);
            document.head.appendChild(handsScript);
        } catch (error) {
            console.error('加载MediaPipe库过程中发生错误:', error);
            reject(error);
        }
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    
    // 初始化语音识别
    initSpeechRecognition();
    handleVoiceInput();
    
    // 初始化摄像头控制
    handleCameraButton();
    
    // 绑定文本输入事件
    const textInput = document.getElementById('textInput');
    textInput.addEventListener('blur', handleTextInput);
    textInput.addEventListener('input', handleTextInput);
    
    // 初始化视频交互组件
    initVideoInteractions();
    
    // 添加全局函数
    window.initHandLandmarker = window.initHandLandmarker || function() {
        console.warn('HandLandmarker初始化函数未定义');
    };
    
    window.initHandTracking = window.initHandTracking || function() {
        console.warn('HandTracking初始化函数未定义');
    };
    
    window.stopHandTracking = window.stopHandTracking || function() {
        console.warn('HandTracking停止函数未定义');
    };
});

// 初始化视频交互组件
function initVideoInteractions() {
    // 确保视频容器存在
    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) {
        console.warn('视频容器不存在，跳过初始化视频交互组件');
        return;
    }
    
    // 监听视频结束事件，但不再弹出确认框
    const signVideo = document.getElementById('signVideo');
    signVideo.addEventListener('ended', () => {
        // 视频播放结束，不再显示确认提示
        // 用户可以通过下方的勾按钮标记为已完成
        console.log('视频播放完毕，用户可以使用下方勾按钮标记为已学会');
    });
}

// 自动隐藏无视频时的视频区域
function updateVideoVisibility() {
    const videoView = document.getElementById('videoView');
    const video = document.getElementById('signVideo');
    if (video && videoView) {
        if (!video.src || video.src === window.location.href || video.src === '') {
            videoView.style.display = 'none';
        } else {
            videoView.style.display = 'flex';
        }
    }
}

// 监听视频加载和清空
const signVideo = document.getElementById('signVideo');
if (signVideo) {
    signVideo.addEventListener('emptied', updateVideoVisibility);
    signVideo.addEventListener('loadeddata', updateVideoVisibility);
    signVideo.addEventListener('pause', updateVideoVisibility);
    signVideo.addEventListener('play', updateVideoVisibility);
}
// 初始化时也执行一次
updateVideoVisibility(); 