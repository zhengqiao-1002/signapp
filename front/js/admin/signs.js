// 显示添加手语的模态框
async function showAddSignModal() {
    try {
        // 加载分类选项
        const response = await Auth.fetchWithAuth('http://localhost:5000/api/admin/categories');
        if (!response) return;

        const categories = await response.json();
        const select = document.getElementById('addSignCategory');
        select.innerHTML = `
            <option value="">请选择分类</option>
            ${categories.map(category => `
                <option value="${category.name}">${category.name}</option>
            `).join('')}
        `;

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('addSignModal'));
        modal.show();
    } catch (error) {
        console.error('Error:', error);
        alert('加载分类选项失败');
    }
}

// 提交添加手语
async function submitAddSign() {
    const keyword = document.getElementById('addSignKeyword').value;
    const category = document.getElementById('addSignCategory').value;
    const description = document.getElementById('addSignDescription').value;
    const videoFile = document.getElementById('addSignVideo').files[0];

    if (!keyword || !category || !videoFile) {
        alert('请填写所有必填字段');
        return;
    }

    // 检查文件大小
    if (videoFile.size > 50 * 1024 * 1024) { // 50MB 限制
        alert('视频文件大小不能超过50MB');
        return;
    }

    // 检查文件类型
    const allowedTypes = ['video/mp4', 'video/webm'];
    if (!allowedTypes.includes(videoFile.type)) {
        alert('只支持 MP4 或 WebM 格式的视频文件');
        return;
    }

    const formData = new FormData();
    formData.append('keyword', keyword);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('video', videoFile);

    // 显示上传进度
    const progressBar = document.createElement('div');
    progressBar.className = 'progress mt-2';
    progressBar.innerHTML = `
        <div class="progress-bar" role="progressbar" style="width: 0%" 
             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
    `;
    document.getElementById('addSignForm').appendChild(progressBar);

    try {
        const response = await Auth.fetchWithAuth('http://localhost:5000/api/admin/signs', {
            method: 'POST',
            body: formData
        });

        if (!response) {
            progressBar.remove();
            return;
        }

        if (response.ok) {
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('addSignModal'));
            modal.hide();

            // 清空表单
            document.getElementById('addSignKeyword').value = '';
            document.getElementById('addSignCategory').value = '';
            document.getElementById('addSignDescription').value = '';
            document.getElementById('addSignVideo').value = '';
            progressBar.remove();

            // 重新加载手语列表
            loadSigns();
            
            alert('添加手语成功！');
        } else {
            const data = await response.json();
            alert(data.message || '添加手语失败');
            progressBar.remove();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('添加手语失败，请稍后重试');
        progressBar.remove();
    }
}

// 显示编辑手语的模态框
async function editSign(id) {
    try {
        // 加载分类选项
        const categoryResponse = await Auth.fetchWithAuth('http://localhost:5000/api/admin/categories');
        if (!categoryResponse) return;

        const categories = await categoryResponse.json();
        const select = document.getElementById('editSignCategory');
        select.innerHTML = `
            <option value="">请选择分类</option>
            ${categories.map(category => `
                <option value="${category.name}">${category.name}</option>
            `).join('')}
        `;

        // 加载手语信息
        const signResponse = await Auth.fetchWithAuth(`http://localhost:5000/api/admin/signs/${id}`);
        if (!signResponse) return;

        const sign = await signResponse.json();
        
        // 填充表单
        document.getElementById('editSignId').value = sign.id;
        document.getElementById('editSignKeyword').value = sign.keyword;
        document.getElementById('editSignCategory').value = sign.category;
        document.getElementById('editSignDescription').value = sign.description || '';

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editSignModal'));
        modal.show();
    } catch (error) {
        console.error('Error:', error);
        alert('获取手语信息失败');
    }
}

// 提交编辑手语
async function submitEditSign() {
    const id = document.getElementById('editSignId').value;
    const keyword = document.getElementById('editSignKeyword').value;
    const category = document.getElementById('editSignCategory').value;
    const description = document.getElementById('editSignDescription').value;
    const videoFile = document.getElementById('editSignVideo').files[0];

    if (!keyword || !category) {
        alert('请填写所有必填字段');
        return;
    }

    const formData = new FormData();
    formData.append('keyword', keyword);
    formData.append('category', category);
    formData.append('description', description);

    if (videoFile) {
        // 检查文件大小
        if (videoFile.size > 50 * 1024 * 1024) { // 50MB 限制
            alert('视频文件大小不能超过50MB');
            return;
        }

        // 检查文件类型
        const allowedTypes = ['video/mp4', 'video/webm'];
        if (!allowedTypes.includes(videoFile.type)) {
            alert('只支持 MP4 或 WebM 格式的视频文件');
            return;
        }

        formData.append('video', videoFile);
    }

    // 显示上传进度
    const progressBar = document.createElement('div');
    progressBar.className = 'progress mt-2';
    progressBar.innerHTML = `
        <div class="progress-bar" role="progressbar" style="width: 0%" 
             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
    `;
    document.getElementById('editSignForm').appendChild(progressBar);

    try {
        const response = await Auth.fetchWithAuth(`http://localhost:5000/api/admin/signs/${id}`, {
            method: 'PUT',
            body: formData
        });

        if (!response) {
            progressBar.remove();
            return;
        }

        if (response.ok) {
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('editSignModal'));
            modal.hide();

            // 清空视频文件输入
            document.getElementById('editSignVideo').value = '';
            progressBar.remove();

            // 重新加载手语列表
            loadSigns();
            
            alert('更新手语成功！');
        } else {
            const data = await response.json();
            alert(data.message || '更新手语失败');
            progressBar.remove();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('更新手语失败，请稍后重试');
        progressBar.remove();
    }
}

// 删除手语
async function deleteSign(id) {
    if (!confirm('确定要删除这个手语吗？')) {
        return;
    }

    try {
        const response = await Auth.fetchWithAuth(`http://localhost:5000/api/admin/signs/${id}`, {
            method: 'DELETE'
        });

        if (!response) return;

        if (response.ok) {
            // 重新加载手语列表
            loadSigns();
            alert('删除手语成功！');
        } else {
            const data = await response.json();
            alert(data.message || '删除手语失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('删除手语失败，请稍后重试');
    }
}

// 播放视频预览
function playVideo(videoUrl) {
    const modalElement = new bootstrap.Modal(document.getElementById('videoPreviewModal'));
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = videoUrl;
    modalElement.show();
    
    // 当模态框关闭时停止视频播放
    document.getElementById('videoPreviewModal').addEventListener('hidden.bs.modal', function () {
        videoPlayer.pause();
        videoPlayer.src = '';
    });
} 