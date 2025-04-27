# 手语学习平台部署指南（Windows 服务器）

## 1. 获取项目代码

1. 在服务器上安装 Git（如果未安装）：

   - 访问 https://git-scm.com/download/win 下载 Git 安装包
   - 运行安装程序，使用默认选项安装

2. 克隆项目代码：

   ```bash
   # 在D盘创建项目目录
   mkdir D:\SignApp
   cd D:\SignApp

   # 克隆代码
   git clone https://gitee.com/the-life-godhushu/signapp.git .
   ```

## 2. 配置 Python 环境

1. 安装项目依赖：

   ```bash
   cd D:\SignApp
   pip install -r requirements.txt
   ```

2. 验证 Python 环境：
   ```bash
   python --version  # 应显示 Python 3.8.6
   ```

## 3. 配置项目

1. 创建上传目录：

   ```bash
   mkdir D:\SignApp\uploads
   ```

2. 修改配置文件：

   - 打开 `backend/config.py`，更新以下配置：

     ```python
     # 数据库配置（使用宝塔面板MySQL的实际密码）
     SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:宝塔MySQL密码@localhost/sign_language_db'

     # 上传文件路径配置
     UPLOAD_FOLDER = 'D:/SignApp/uploads'

     # 文件大小限制（50MB）
     MAX_CONTENT_LENGTH = 50 * 1024 * 1024
     ```

## 4. 配置防火墙

1. 在 Windows 防火墙中添加入站规则：

   - 打开"Windows Defender 防火墙"
   - 点击"高级设置"
   - 选择"入站规则" -> "新建规则"
   - 选择"端口"
   - TCP，特定本地端口：5000
   - 允许连接
   - 填写名称（如：SignApp）

2. 在阿里云安全组中添加规则：
   - 协议类型：TCP
   - 端口范围：5000
   - 授权对象：0.0.0.0/0

## 5. 启动服务

### 5.1 测试运行

```bash
cd D:\SignApp
python app.py
```

### 5.2 配置开机自启

1. 创建启动脚本 `D:\SignApp\start_server.bat`：

   ```batch
   @echo off
   cd /d D:\SignApp
   python app.py
   ```

2. 创建快捷方式：
   - 右键 `start_server.bat` -> 创建快捷方式
   - 将快捷方式移动到：
     `C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

## 6. 验证部署

1. 本地访问测试：

   - 浏览器访问：http://localhost:5000

2. 远程访问测试：

   - 浏览器访问：http://[服务器公网 IP]:5000

3. 测试管理员登录：
   - 用户名：admin
   - 密码：admin123

## 7. 维护建议

### 7.1 日常维护

1. 定期检查日志文件
2. 监控磁盘空间使用情况
3. 定期备份数据库和上传的视频文件

### 7.2 数据库备份

使用宝塔面板进行数据库备份：

1. 进入宝塔面板 -> 数据库
2. 选择 sign_language_db
3. 点击"备份"

### 7.3 性能优化

1. 定期清理不使用的视频文件
2. 监控服务器 CPU 和内存使用情况
3. 必要时调整视频文件大小限制

### 7.4 安全建议

1. 定期更新系统和依赖包
2. 检查并更新防火墙规则
3. 监控异常登录尝试
4. 定期更改数据库密码

## 8. 故障排除

### 8.1 常见问题

1. 无法访问网站

   - 检查 Flask 服务是否运行
   - 验证防火墙配置
   - 确认端口 5000 是否开放

2. 数据库连接错误

   - 验证数据库密码是否正确
   - 检查 MySQL 服务状态
   - 确认数据库用户权限

3. 文件上传失败
   - 检查 uploads 目录权限
   - 验证磁盘空间是否充足
   - 确认文件大小是否超出限制
