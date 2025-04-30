# 星语桥·SignFlow

星语桥·SignFlow 是一个基于人工智能的现代化手语学习与识别平台，致力于为听障人士、手语学习者和教育者提供便捷、智能、丰富的手语学习体验。平台集成了手语视频学习、实时手语识别、个性化学习统计、AI 助手等多项功能，助力手语的普及与交流。


---

## 🌟 系统简介

- **品牌愿景**：让手语沟通无障碍，搭建"星语桥"，让每个人都能轻松学习和使用手语。
- **核心亮点**：结合 AI 识别、视频教学、个性化推荐与互动，打造全方位手语学习生态。

---

## 🚀 功能特点

- **用户认证系统**：支持注册、登录、JWT 权限管理，保障数据安全。
- **手语视频管理**：上传、编辑、删除手语视频，支持分类浏览和检索。
- **手语识别**：集成本地 AI 模型与豆包 API，支持摄像头实时手语识别和语音转文字。
- **学习统计与进度**：自动记录学习天数、已学/收藏手语、学习进度可视化。
- **个性化推荐**：根据学习历史和兴趣，智能推荐常用手语。
- **AI 助手**：内置"星语桥小助手"，可智能答疑、辅助学习。
- **管理员后台**：支持用户、手语、分类等管理操作。
- **响应式前端**：适配 PC 和移动端，界面美观易用。

---

## 🛠 技术栈

- **后端**：Python Flask、SQLAlchemy ORM、JWT 认证
- **数据库**：MySQL
- **前端**：HTML5、CSS3、JavaScript (ES6+)、Bootstrap
- **AI/识别**：MediaPipe、TensorFlow、豆包 API、WebRTC、MediaRecorder


---

## ⚡ 安装与部署

### 1. 克隆项目

```bash
git clone [[你的Gitee仓库地址]](https://github.com/zhengqiao-1002/signapp)
cd SignApp
```

### 2. 创建并激活虚拟环境

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate
# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 4. 配置环境变量

在`backend/.env`文件中设置：

```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=sign_language_db
JWT_SECRET_KEY=your_secret_key
DOUBAO_API_KEY=your_api_key_here  # 如需使用豆包API
```

### 5. 初始化数据库

```bash
python app.py  # 首次运行会自动建表
```

### 6. 启动服务

```bash
python app.py
```

> 如需生产环境部署，建议使用 gunicorn + nginx，或 Docker 容器化。

---

## 📁 项目结构

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

---

## 👩‍💻 使用说明

### 普通用户

1. 访问 `http://localhost:5000` 进入平台首页。
2. 注册新用户或使用已有账号登录。
3. 在"手语参考"中浏览和学习手语视频。
4. 使用首页的文字/语音输入，体验手语识别与翻译。
5. 在"个人中心"查看学习统计、收藏、进度等。

### 管理员

1. 使用管理员账号登录后台。登录地址http://localhost:5000//admin/login.html
2. 管理用户、手语视频、分类等。
3. 可重置用户密码、审核内容等。

---

## 🤖 手语识别 API 配置

本系统支持本地 AI 识别和火山引擎·豆包 API 识别两种模式：

- **本地识别**：无需外部 API，适合离线或本地部署。
- **火山引擎·豆包 API 识别**：需在[火山引擎开放平台](https://www.volcengine.com/product/doubao)注册并获取 API 密钥。

### 配置方法

1. 在`.env`文件中添加：
   ```
   DOUBAO_API_KEY=your_api_key_here
   ```
2. 重启后端服务。
3. 未配置 API 密钥时，系统自动切换为本地识别。

### 切换识别模式

在`front/js/user/sign.js`中：

```javascript
const USE_API_RECOGNITION = true; // true为API识别，false为本地识别
```

---

## 📝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 遵循[PEP8](https://peps.python.org/pep-0008/)和前端代码规范
4. 提交更改 (`git commit -m 'feat: your message'`)
5. 推送到分支 (`git push origin feature/your-feature`)
6. 提交 Pull Request 并描述你的改动

欢迎提交文档、功能、Bug 修复等各类贡献！

---

## 📄 许可证

[MIT License](LICENSE)

---

如有任何问题或建议，欢迎在 Issues 区留言，或联系项目维护者。
