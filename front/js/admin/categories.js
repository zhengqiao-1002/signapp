// 显示添加分类的模态框
function showAddCategoryModal() {
    const modal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
    // 清空表单
    document.getElementById('addCategoryName').value = '';
    document.getElementById('addCategoryDescription').value = '';
    modal.show();
}

// 提交添加分类
async function submitAddCategory() {
    const name = document.getElementById('addCategoryName').value;
    const description = document.getElementById('addCategoryDescription').value;

    if (!name) {
        alert('请填写分类名称');
        return;
    }

    try {
        const response = await Auth.fetchWithAuth('http://localhost:5000/api/admin/categories', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });

        if (!response) return;

        if (response.ok) {
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
            modal.hide();

            // 清空表单
            document.getElementById('addCategoryName').value = '';
            document.getElementById('addCategoryDescription').value = '';

            // 重新加载分类列表
            loadCategories();
            
            alert('添加分类成功！');
        } else {
            const data = await response.json();
            alert(data.message || '添加分类失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('添加分类失败，请稍后重试');
    }
}

// 显示编辑分类的模态框
async function editCategory(id) {
    try {
        const response = await Auth.fetchWithAuth(`http://localhost:5000/api/admin/categories/${id}`);
        if (!response) return;

        const category = await response.json();
        
        // 填充表单
        document.getElementById('editCategoryId').value = category.id;
        document.getElementById('editCategoryName').value = category.name;
        document.getElementById('editCategoryDescription').value = category.description || '';

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
        modal.show();
    } catch (error) {
        console.error('Error:', error);
        alert('获取分类信息失败');
    }
}

// 提交编辑分类
async function submitEditCategory() {
    const id = document.getElementById('editCategoryId').value;
    const name = document.getElementById('editCategoryName').value;
    const description = document.getElementById('editCategoryDescription').value;

    if (!name) {
        alert('请填写分类名称');
        return;
    }

    try {
        const response = await Auth.fetchWithAuth(`http://localhost:5000/api/admin/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description })
        });

        if (!response) return;

        if (response.ok) {
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('editCategoryModal'));
            modal.hide();

            // 重新加载分类列表
            loadCategories();
            
            alert('更新分类成功！');
        } else {
            const data = await response.json();
            alert(data.message || '更新分类失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('更新分类失败，请稍后重试');
    }
}

// 删除分类
async function deleteCategory(id) {
    if (!confirm('确定要删除这个分类吗？')) {
        return;
    }

    try {
        const response = await Auth.fetchWithAuth(`http://localhost:5000/api/admin/categories/${id}`, {
            method: 'DELETE'
        });

        if (!response) return;

        if (response.ok) {
            // 重新加载分类列表
            loadCategories();
            alert('删除分类成功！');
        } else {
            const data = await response.json();
            alert(data.message || '删除分类失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('删除分类失败，请稍后重试');
    }
} 