# 手语学习平台

一个基于 Flask 和 MySQL 的手语学习平台，提供手语视频学习、分类管理、用户管理等功能。

## 功能特点

- 用户认证系统（注册、登录、权限管理）
- 手语视频管理（上传、编辑、删除）
- 分类管理
- 管理员后台
- 响应式前端界面

## 技术栈

- 后端：Python Flask
- 数据库：MySQL
- 前端：HTML, CSS, JavaScript, Bootstrap
- 认证：JWT (JSON Web Token)

## 安装说明

1. 克隆项目

```bash
git clone [你的Gitee仓库地址]
cd SignApp
```

2. 创建并激活虚拟环境

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

4. 配置环境变量
   创建 `.env` 文件并设置以下变量：

```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=sign_language_db
JWT_SECRET_KEY=your_secret_key
```

5. 初始化数据库

```bash
python app.py
```

6. 运行应用

```bash
python app.py
```

## 项目结构

```
SignApp/
├── backend/            # 后端代码
│   ├── app.py         # 主应用文件
│   ├── models.py      # 数据库模型
│   └── requirements.txt # 依赖包
├── front/             # 前端代码
│   ├── html/         # HTML模板
│   ├── css/          # 样式文件
│   └── js/           # JavaScript文件
└── README.md         # 项目说明
```

## 使用说明

1. 访问 `http://localhost:5000` 进入应用
2. 注册新用户或使用管理员账号登录
3. 管理员可以管理用户、分类和手语视频
4. 普通用户可以浏览和学习手语视频

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

[MIT License](LICENSE)
