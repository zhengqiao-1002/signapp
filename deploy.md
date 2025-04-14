# 部署指南

## 1. 服务器环境准备

### 1.1 安装必要的软件

```bash
# 更新系统
sudo apt update
sudo apt upgrade

# 安装必要的包
sudo apt install python3-pip python3-venv nginx mysql-server

# 安装 MySQL 开发库
sudo apt install python3-dev default-libmysqlclient-dev build-essential
```

### 1.2 配置 MySQL

```bash
sudo mysql_secure_installation
```

创建数据库和用户：

```sql
CREATE DATABASE sign_language_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'signapp'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON sign_language_db.* TO 'signapp'@'localhost';
FLUSH PRIVILEGES;
```

## 2. 项目部署

### 2.1 克隆项目

```bash
git clone https://gitee.com/the-life-godhushu/signapp.git
cd signapp
```

### 2.2 设置 Python 虚拟环境

```bash
python3 -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
```

### 2.3 配置环境变量

创建 `.env` 文件：

```
DB_HOST=localhost
DB_USER=signapp
DB_PASSWORD=your_password
DB_NAME=sign_language_db
JWT_SECRET_KEY=your_jwt_secret_key

# 阿里云OSS配置
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET_NAME=your_bucket_name
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_BUCKET_DOMAIN=your_bucket_domain
```

### 2.4 配置 Gunicorn

创建 `gunicorn.conf.py`：

```python
bind = "127.0.0.1:8000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
```

### 2.5 配置 Nginx

创建 `/etc/nginx/sites-available/signapp`：

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        root /path/to/signapp/front;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/signapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2.6 配置 Systemd 服务

创建 `/etc/systemd/system/signapp.service`：

```ini
[Unit]
Description=SignApp Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/signapp/backend
Environment="PATH=/path/to/signapp/venv/bin"
ExecStart=/path/to/signapp/venv/bin/gunicorn -c gunicorn.conf.py app:app

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl start signapp
sudo systemctl enable signapp
```

## 3. 阿里云 OSS 配置

1. 登录阿里云控制台
2. 创建 OSS Bucket：
   - 选择合适的地域
   - 设置访问权限为"公共读"
   - 开启跨域访问(CORS)设置
3. 创建 RAM 用户并获取 AccessKey
4. 配置 Bucket 域名

## 4. 维护说明

### 4.1 日志查看

```bash
sudo journalctl -u signapp
sudo tail -f /var/log/nginx/error.log
```

### 4.2 更新部署

```bash
cd /path/to/signapp
git pull
source venv/bin/activate
cd backend
pip install -r requirements.txt
sudo systemctl restart signapp
```

### 4.3 备份

定期备份数据库：

```bash
mysqldump -u signapp -p sign_language_db > backup_$(date +%Y%m%d).sql
```
