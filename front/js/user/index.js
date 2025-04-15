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
        <div class="keyword-item" onclick="playSignVideo('${keyword.id}', '${keyword.text}')">
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
    } catch (error) {
        console.error('摄像头访问失败:', error);
        alert('无法访问摄像头，请确保已授予权限');
    }
}

// 停止摄像头
async function stopCamera() {
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
    document.getElementById('videoView').style.display = 'flex';
    document.getElementById('cameraView').style.display = 'none';
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
}); 