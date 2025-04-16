# 手语学习平台部署指南

## 1. 环境准备

### 1.1 Python 环境安装

1. 访问 [Python 官网](https://www.python.org/downloads/) 下载 Python 3.11.5
2. 安装时勾选"Add Python to PATH"
3. 验证安装：打开命令提示符，输入：
   ```bash
   python --version
   pip --version
   ```

### 1.2 MySQL 数据库配置（使用宝塔面板）

1. 在宝塔面板中找到已安装的 MySQL 5.5.62
2. 使用 phpMyAdmin 或宝塔面板的数据库管理功能：
   - 创建新的数据库：`sign_language_db`
   - 字符集选择：`utf8mb4`
   - 排序规则：`utf8mb4_unicode_ci`
3. 记录数据库连接信息：
   - 主机：localhost
   - 端口：3306
   - 用户名：root
   - 密码：（宝塔面板中设置的密码）
   - 数据库名：sign_language_db

### 1.3 配置项目存储路径

1. 在 D 盘创建项目目录：
   ```bash
   D:\SignApp
   ```
2. 在 D 盘创建视频存储目录：
   ```bash
   D:\SignApp\uploads
   ```

## 2. 项目部署

### 2.1 代码部署

1. 将项目代码复制到 `D:\SignApp` 目录
2. 修改项目配置：

   - 打开 `backend/config.py`，修改以下配置：

     ```python
     # 数据库配置（使用宝塔MySQL的密码）
     SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:宝塔MySQL密码@localhost/sign_language_db'

     # 上传文件路径配置
     UPLOAD_FOLDER = 'D:/SignApp/uploads'

     # 文件大小限制（50MB）
     MAX_CONTENT_LENGTH = 50 * 1024 * 1024
     ```

### 2.2 安装依赖

1. 在命令提示符中进入项目目录：
   ```bash
   cd D:\SignApp
   ```
2. 安装项目依赖：
   ```bash
   pip install -r requirements.txt
   ```

### 2.3 初始化数据库

1. 在 Python 交互环境中执行：
   ```python
   from app import app, db
   with app.app_context():
       db.create_all()
   ```

### 2.4 配置防火墙

1. 打开 Windows 防火墙设置
2. 添加入站规则，开放 5000 端口
3. 在阿里云控制台的安全组中添加规则：
   - 协议类型：TCP
   - 端口范围：5000
   - 授权对象：0.0.0.0/0

## 3. 启动服务

### 3.1 手动启动

```bash
cd D:\SignApp
python app.py
```

### 3.2 配置开机自启（可选）

1. 创建启动脚本 `start_server.bat`：
   ```batch
   cd /d D:\SignApp
   python app.py
   ```
2. 将脚本快捷方式放入启动文件夹：
   `C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

## 4. 访问测试

1. 本地访问测试：

   - http://localhost:5000

2. 远程访问测试：
   - http://[服务器公网 IP]:5000

## 5. 注意事项

### 5.1 视频文件管理

- 视频文件存储在 `D:\SignApp\uploads` 目录
- 单个视频大小限制为 50MB
- 建议定期备份视频文件

### 5.2 数据库备份

```bash
# 使用宝塔面板进行数据库备份
# 方法1：通过宝塔面板的数据库管理界面进行备份
# 方法2：使用命令行
mysqldump -u root -p sign_language_db > backup.sql

# 恢复数据库
mysql -u root -p sign_language_db < backup.sql
```

### 5.3 性能优化建议

1. 定期清理不使用的视频文件
2. 监控磁盘使用情况
3. 根据需要调整视频文件大小限制

### 5.4 安全建议

1. 使用宝塔面板的安全设置
2. 定期更新系统和依赖包
3. 配置 SSL 证书（如需要）
4. 限制上传文件类型为视频格式
5. 定期检查宝塔面板安全日志
