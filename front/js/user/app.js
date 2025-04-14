// DOM元素
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const gestureText = document.getElementById('gesture-text');
const confidenceLevel = document.getElementById('confidence-level');
const resultText = document.getElementById('result');
const confidenceText = document.getElementById('confidence');
const historyList = document.getElementById('history-list');

// 设置canvas尺寸
canvas.width = 640;
canvas.height = 480;

// 历史记录最大条数
const MAX_HISTORY = 5;
const HISTORY_BUFFER_SIZE = 10;
let gestureHistory = [];

// 初始化MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

// 配置MediaPipe Hands
hands.setOptions({
    maxNumHands: 2,  // 修改为支持两只手
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

// 处理手势识别结果
hands.onResults(onResults);

// 设置相机
const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 640,
    height: 480
});

// 启动相机
camera.start();

// 计算两点之间的距离
function calculateDistance(p1, p2) {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2)
    );
}

// 计算手指是否伸直
function isFingerExtended(points, baseIndex, midIndex, tipIndex) {
    const base = points[baseIndex];
    const mid = points[midIndex];
    const tip = points[tipIndex];
    
    const totalDist = calculateDistance(base, tip);
    const midDist = calculateDistance(base, mid);
    
    // 调整判断标准，使其更容易判断手指伸直状态
    return midDist/totalDist < 0.80;
}

// 计算手指弯曲角度
function calculateFingerAngle(points, baseIndex, midIndex, tipIndex) {
    const base = points[baseIndex];
    const mid = points[midIndex];
    const tip = points[tipIndex];

    const vector1 = {
        x: mid.x - base.x,
        y: mid.y - base.y,
        z: mid.z - base.z
    };
    const vector2 = {
        x: tip.x - mid.x,
        y: tip.y - mid.y,
        z: tip.z - mid.z
    };

    const dot = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z);
    const angle = Math.acos(dot / (mag1 * mag2));
    return angle * (180 / Math.PI);
}

// 计算手指是否弯曲
function isFingerBent(angle) {
    return angle > 45; // 调整判断标准，使弯曲判断更严格
}

// 计算手指是否完全弯曲（握拳）
function isFingerFullyBent(angle) {
    return angle > 90; // 完全弯曲的判断标准
}

// 识别手势
function recognizeGesture(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;
    
    // 获取第一只手的信息
    const points = landmarks[0];
    
    // 计算每个手指的角度
    const thumbAngle = calculateFingerAngle(points, 2, 3, 4);
    const indexAngle = calculateFingerAngle(points, 5, 6, 8);
    const middleAngle = calculateFingerAngle(points, 9, 10, 12);
    const ringAngle = calculateFingerAngle(points, 13, 14, 16);
    const pinkyAngle = calculateFingerAngle(points, 17, 18, 20);
    
    // 检查每个手指是否伸直
    const thumbExtended = !isFingerBent(thumbAngle);
    const indexExtended = !isFingerBent(indexAngle);
    const middleExtended = !isFingerBent(middleAngle);
    const ringExtended = !isFingerBent(ringAngle);
    const pinkyExtended = !isFingerBent(pinkyAngle);
    
    // 检查是否完全弯曲（握拳）
    const indexFullyBent = isFingerFullyBent(indexAngle);
    const middleFullyBent = isFingerFullyBent(middleAngle);
    const ringFullyBent = isFingerFullyBent(ringAngle);
    const pinkyFullyBent = isFingerFullyBent(pinkyAngle);
    
    // 计算手掌方向
    const palmNormal = calculatePalmNormal(points);
    const palmFacingFront = palmNormal.z < -0.5;
    const palmFacingUp = palmNormal.y < -0.5;
    
    const confidence = 0.85;

    // 检查是否有两只手
    const hasTwoHands = landmarks.length === 2;
    
    // 数字2：食指和中指伸直成V形，其他手指弯曲
    if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        // 检查食指和中指是否分开（V形）
        const fingerSpread = Math.abs(points[8].x - points[12].x);
        // V形要求手指分开的距离要足够大
        if (fingerSpread > 0.15) {
            return { gesture: "2", confidence };
        }
    }
    
    // 数字3：拇指、食指和中指伸直，其他手指弯曲
    if (thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        // 检查三个手指是否并拢
        const spread1 = Math.abs(points[4].x - points[8].x); // 拇指和食指间距
        const spread2 = Math.abs(points[8].x - points[12].x); // 食指和中指间距
        if (spread1 < 0.1 && spread2 < 0.1) {
            return { gesture: "3", confidence };
        }
    }
    
    // 数字10：双手手势，一只手伸出食指，另一只手握拳
    if (hasTwoHands) {
        const points2 = landmarks[1];
        const isFirstHandIndex = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
        const isSecondHandFist = points2 && isHandFist(points2);
        if (isFirstHandIndex && isSecondHandFist) {
            return { gesture: "10", confidence };
        }
    }
    
    // "很棒"：竖起大拇指，其他手指自然弯曲（不是完全握拳）
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended &&
        !indexFullyBent && !middleFullyBent && !ringFullyBent && !pinkyFullyBent) {
        return { gesture: "很棒", confidence };
    }

    // "你好"：食指向前指，其他手指弯曲
    if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended && palmFacingFront) {
        const indexDirection = Math.abs(points[8].z - points[5].z);
        if (indexDirection > 0.1) { // 确保食指是向前指
            return { gesture: "你好", confidence };
        }
    }

    // "谢谢"：双手合十
    if (hasTwoHands) {
        const points2 = landmarks[1];
        const handsClose = areHandsClose(points, points2);
        const bothPalmsFacing = arePalmsFacing(points, points2);
        if (handsClose && bothPalmsFacing) {
            return { gesture: "谢谢", confidence };
        }
    }

    // 数字1：食指伸直，其他手指弯曲，手掌朝前
    if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended && palmFacingFront) {
        return { gesture: "1", confidence };
    }
    
    // 数字4：除拇指外的四指伸直，拇指弯曲
    if (!thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return { gesture: "4", confidence };
    }
    
    // 数字5：所有手指伸直，掌心朝前
    if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended && palmFacingFront) {
        return { gesture: "5", confidence };
    }
    
    // 数字6：拇指和小指伸直，其他手指弯曲
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
        return { gesture: "6", confidence };
    }
    
    // 数字7：拇指、食指和小指伸直，其他手指弯曲
    if (thumbExtended && indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
        return { gesture: "7", confidence };
    }
    
    // 数字8：拇指、食指、中指和小指伸直，无名指弯曲
    if (thumbExtended && indexExtended && middleExtended && !ringExtended && pinkyExtended) {
        return { gesture: "8", confidence };
    }
    
    // 数字9：食指弯曲成钩状，其他手指伸直
    if (thumbExtended && isFingerBent(indexAngle) && !isFingerFullyBent(indexAngle) && 
        middleExtended && ringExtended && pinkyExtended) {
        return { gesture: "9", confidence };
    }
    
    // "再见" - 手掌张开摆动
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && Math.abs(palmNormal.z) > 0.3) {
        return { gesture: "再见", confidence };
    }
    
    // "谢谢" - 手指并拢，手掌向上
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && palmFacingUp) {
        return { gesture: "谢谢", confidence };
    }
    
    // "请" - 手掌向上，手指自然弯曲
    if (palmFacingUp && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        const tipSum = points[8].y + points[12].y + points[16].y + points[20].y;
        if (tipSum / 4 < points[0].y) {  // 手指尖平均位置高于手腕
            return { gesture: "请", confidence };
        }
    }
    
    // "对不起" - 握拳靠近胸前
    if (!thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        if (points[0].x < 0.3) {  // 手在左侧（靠近胸前）
            return { gesture: "对不起", confidence };
        }
    }
    
    return { gesture: "未知手势", confidence: 0 };
}

// 计算手掌法向量
function calculatePalmNormal(points) {
    const index_base = points[5];
    const middle_base = points[9];
    const ring_base = points[13];
    
    const v1 = {
        x: middle_base.x - index_base.x,
        y: middle_base.y - index_base.y,
        z: middle_base.z - index_base.z
    };
    
    const v2 = {
        x: ring_base.x - middle_base.x,
        y: ring_base.y - middle_base.y,
        z: ring_base.z - middle_base.z
    };
    
    // 计算叉积
    const normal = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };
    
    // 归一化
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
    
    return normal;
}

// 平滑手势识别结果
function smoothGestureRecognition(gesture) {
    if (!gesture) return { gesture: "未知手势", confidence: 0 };
    
    gestureHistory.push(gesture);
    if (gestureHistory.length > HISTORY_BUFFER_SIZE) {
        gestureHistory.shift();
    }
    
    // 统计最近几帧中出现最多的手势
    const gestureCounts = {};
    gestureHistory.forEach(g => {
        gestureCounts[g.gesture] = (gestureCounts[g.gesture] || 0) + 1;
    });
    
    let maxCount = 0;
    let dominantGesture = gesture;
    
    for (const [g, count] of Object.entries(gestureCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantGesture = { gesture: g, confidence: gesture.confidence };
        }
    }
    
    // 只有当某个手势出现次数超过一半时才返回该手势
    if (maxCount >= HISTORY_BUFFER_SIZE / 2) {
        return dominantGesture;
    }
    
    return { gesture: "未知手势", confidence: 0 };
}

// 添加识别结果到历史记录
function addToHistory(gesture, confidence) {
    const time = new Date().toLocaleTimeString();
    const item = document.createElement('li');
    item.className = 'list-group-item';
    item.innerHTML = `
        <span>${gesture}</span>
        <small class="text-muted">${time} (${(confidence * 100).toFixed(1)}%)</small>
    `;
    
    historyList.insertBefore(item, historyList.firstChild);
    
    if (historyList.children.length > MAX_HISTORY) {
        historyList.removeChild(historyList.lastChild);
    }
}

// 更新置信度条
function updateConfidenceBar(confidence) {
    const percentage = confidence * 100;
    confidenceLevel.style.width = `${percentage}%`;
    
    if (percentage > 70) {
        confidenceLevel.style.backgroundColor = '#4CAF50';
    } else if (percentage > 50) {
        confidenceLevel.style.backgroundColor = '#FFC107';
    } else {
        confidenceLevel.style.backgroundColor = '#F44336';
    }
}

// 检查手是否握拳
function isHandFist(points) {
    const angles = [
        calculateFingerAngle(points, 5, 6, 8),  // 食指
        calculateFingerAngle(points, 9, 10, 12), // 中指
        calculateFingerAngle(points, 13, 14, 16), // 无名指
        calculateFingerAngle(points, 17, 18, 20)  // 小指
    ];
    return angles.every(angle => isFingerFullyBent(angle));
}

// 检查两只手是否靠近
function areHandsClose(hand1, hand2) {
    const dist = Math.sqrt(
        Math.pow(hand1[0].x - hand2[0].x, 2) +
        Math.pow(hand1[0].y - hand2[0].y, 2) +
        Math.pow(hand1[0].z - hand2[0].z, 2)
    );
    return dist < 0.2;
}

// 检查两只手掌是否相对
function arePalmsFacing(hand1, hand2) {
    const normal1 = calculatePalmNormal(hand1);
    const normal2 = calculatePalmNormal(hand2);
    const dot = normal1.x * normal2.x + normal1.y * normal2.y + normal1.z * normal2.z;
    return Math.abs(dot + 1) < 0.5; // 手掌相对时法向量应该相反
}

// 处理MediaPipe结果
function onResults(results) {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制摄像头画面
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // 绘制手部关键点和连接线
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 2
            });
            drawLandmarks(ctx, landmarks, {
                color: '#FF0000',
                lineWidth: 1,
                radius: 3
            });
        }
        
        // 识别手势
        const gestureResult = recognizeGesture(results.multiHandLandmarks);
        const smoothedResult = smoothGestureRecognition(gestureResult);
        
        // 更新显示
        if (smoothedResult.gesture !== "未知手势") {
            gestureText.textContent = smoothedResult.gesture;
            resultText.textContent = smoothedResult.gesture;
            confidenceText.textContent = `置信度: ${(smoothedResult.confidence * 100).toFixed(1)}%`;
            updateConfidenceBar(smoothedResult.confidence);
            addToHistory(smoothedResult.gesture, smoothedResult.confidence);
        } else {
            gestureText.textContent = "等待识别...";
            resultText.textContent = "等待手语输入...";
            confidenceText.textContent = "置信度: 0%";
            updateConfidenceBar(0);
        }
    } else {
        gestureText.textContent = "未检测到手势";
        resultText.textContent = "未检测到手势";
        confidenceText.textContent = "置信度: 0%";
        updateConfidenceBar(0);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
        // 未登录，重定向到登录页面
        window.location.href = '/user/login';
        return;
    }

    // 显示用户名
    document.getElementById('username').textContent = username;

    // 处理退出按钮点击
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // 清除本地存储的用户信息
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userType');
        // 重定向到登录页面
        window.location.href = '/user/login';
    });

    // 初始化手语识别相关功能
    initializeHandRecognition();
});

function initializeHandRecognition() {
    // TODO: 实现手语识别功能
    // 这里将添加 MediaPipe 和手语识别的具体实现
    console.log('Hand recognition initialized');
} 