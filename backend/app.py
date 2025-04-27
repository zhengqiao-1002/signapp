from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta, datetime, date
import os
from dotenv import load_dotenv
import bcrypt
from sqlalchemy import func
from collections import defaultdict
import base64
import requests
import json
import io
from PIL import Image

# 访问计数器
visit_counter = defaultdict(int)
last_reset_date = None

def get_today_date():
    return datetime.now().date()

def reset_counter_if_needed():
    global last_reset_date
    today = get_today_date()
    if last_reset_date != today:
        visit_counter.clear()
        last_reset_date = today

# 加载环境变量
load_dotenv()

# 直接设置API密钥
os.environ['DOUBAO_API_KEY'] = 'a07fdff1-e053-4bb3-bea1-906e0a426c80'

# 配置Flask应用
app = Flask(__name__, static_folder='../front', static_url_path='')
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 配置最大文件上传大小为 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB in bytes

# 配置上传文件夹
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 配置数据库
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://root:123456@localhost/sign_language_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# 初始化扩展
from extensions import db
db.init_app(app)
jwt = JWTManager(app)

# 导入模型
from models import User, Sign, SignCategory, VisitLog, Favorite, LearningProgress

# 请求中间件，记录所有访问
@app.before_request
def log_request():
    # 忽略静态文件和API请求
    if not request.path.startswith('/static') and not request.path.startswith('/uploads') and not request.path.startswith('/api/'):
        # 更新内存中的计数器（用于管理员统计）
        reset_counter_if_needed()
        visit_counter[get_today_date()] += 1
        
        # 记录访问日志到数据库
        try:
            # 尝试获取当前用户ID
            user_id = None
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    identity = get_jwt_identity()
                    user = User.query.filter_by(username=identity).first()
                    if user:
                        user_id = user.id
                except:
                    pass  # 如果token无效，忽略错误
            
            # 创建访问日志
            log = VisitLog(
                user_id=user_id,
                visit_time=datetime.utcnow(),
                ip_address=request.remote_addr,
                visit_page=request.path
            )
            db.session.add(log)
            db.session.commit()
        except Exception as e:
            print(f"记录访问日志时出错: {str(e)}")
            db.session.rollback()  # 回滚事务
            # 即使记录日志失败，也不应影响用户体验，所以这里不抛出异常

# 处理上传的文件
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 根路由重定向到用户登录页面
@app.route('/')
def root():
    return send_from_directory('../front/html/user', 'login.html')

# 用户登录页面 - 支持多种URL格式
@app.route('/user/login.html')
@app.route('/user/login')
def user_login_page():
    return send_from_directory('../front/html/user', 'login.html')

# 用户注册页面 - 支持多种URL格式
@app.route('/user/register.html')
@app.route('/user/register')
@app.route('/register.html')
@app.route('/register')
def user_register_page():
    return send_from_directory('../front/html/user', 'register.html')

# 用户首页
@app.route('/user/index.html')
def user_index():
    return send_from_directory('../front/html/user', 'index.html')

# 手语参考页面
@app.route('/user/reference.html')
def user_reference():
    return send_from_directory('../front/html/user', 'reference.html')

# 关于页面
@app.route('/user/about.html')
def user_about():
    return send_from_directory('../front/html/user', 'about.html')

# 个人中心页面
@app.route('/user/profile.html')
def user_profile_page():
    return send_from_directory('../front/html/user', 'profile.html')

# 管理员登录页面
@app.route('/admin/login.html')
def admin_login_page():
    return send_from_directory('../front/html/admin', 'login.html')

# 管理员仪表盘页面
@app.route('/admin/dashboard.html')
def admin_dashboard_page():
    return send_from_directory('../front/html/admin', 'dashboard.html')

# 获取统计数据
@app.route('/api/admin/statistics', methods=['GET'])
@jwt_required()
def get_statistics():
    try:
        # 验证用户类型
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user or user.user_type != 'admin':
            return jsonify({'message': 'Unauthorized access'}), 401
        
        # 获取实时统计数据
        total_signs = Sign.query.count()
        total_categories = SignCategory.query.count()
        
        # 只统计普通用户（user_type = 'user'）
        total_users = User.query.filter_by(user_type='user').count()
        print(f"Debug - 用户总数: {total_users}")  # 添加调试信息
        
        # 获取今日访问量
        reset_counter_if_needed()
        today_visits = visit_counter[get_today_date()]
        
        print(f"Debug - 今日访问统计: {today_visits}")  # 添加调试信息
        print(f"Debug - 统计日期: {get_today_date()}")   # 添加调试信息
        
        return jsonify({
            'totalSigns': total_signs,
            'totalCategories': total_categories,
            'totalUsers': total_users,
            'todayVisits': today_visits
        })
    except Exception as e:
        print(f"获取统计数据时出错: {str(e)}")
        return jsonify({'message': '获取统计数据失败'}), 500

def check_file_size(file):
    """检查文件大小是否超过限制"""
    content = file.read()
    file.seek(0)  # 重置文件指针
    if len(content) > app.config['MAX_CONTENT_LENGTH']:
        return False
    return True

# 手语管理
@app.route('/api/admin/signs', methods=['GET', 'POST'])
@jwt_required()
def manage_signs():
    if request.method == 'GET':
        signs = Sign.query.all()
        return jsonify([{
            'id': sign.id,
            'keyword': sign.keyword,
            'category': sign.category,
            'video_url': sign.video_url,
            'description': sign.description
        } for sign in signs])
    
    elif request.method == 'POST':
        data = request.form
        video = request.files.get('video')
        
        if video:
            # 检查文件大小
            if not check_file_size(video):
                return jsonify({'message': '视频文件大小不能超过50MB'}), 400
                
            # 生成唯一的文件名
            filename = f"{int(datetime.now().timestamp())}_{video.filename}"
            video_url = f'/uploads/{filename}'
            video.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        else:
            video_url = None
        
        new_sign = Sign(
            keyword=data.get('keyword'),
            category=data.get('category'),
            video_url=video_url,
            description=data.get('description')
        )
        
        db.session.add(new_sign)
        db.session.commit()
        
        return jsonify({'message': 'Sign added successfully'}), 201

# 获取单个手语
@app.route('/api/admin/signs/<int:sign_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_sign(sign_id):
    sign = Sign.query.get_or_404(sign_id)
    
    if request.method == 'GET':
        return jsonify({
            'id': sign.id,
            'keyword': sign.keyword,
            'category': sign.category,
            'video_url': sign.video_url,
            'description': sign.description
        })
    
    elif request.method == 'PUT':
        data = request.form
        video = request.files.get('video')
        
        if video:
            # 检查文件大小
            if not check_file_size(video):
                return jsonify({'message': '视频文件大小不能超过50MB'}), 400
                
            # 删除旧视频
            if sign.video_url:
                old_video_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(sign.video_url))
                if os.path.exists(old_video_path):
                    os.remove(old_video_path)
            
            # 保存新视频
            filename = f"{int(datetime.now().timestamp())}_{video.filename}"
            video_url = f'/uploads/{filename}'
            video.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            sign.video_url = video_url
        
        sign.keyword = data.get('keyword', sign.keyword)
        sign.category = data.get('category', sign.category)
        sign.description = data.get('description', sign.description)
        
        db.session.commit()
        return jsonify({'message': 'Sign updated successfully'})
    
    elif request.method == 'DELETE':
        # 删除视频文件
        if sign.video_url:
            video_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(sign.video_url))
            if os.path.exists(video_path):
                os.remove(video_path)
        
        db.session.delete(sign)
        db.session.commit()
        return jsonify({'message': 'Sign deleted successfully'})

# 获取分类列表
@app.route('/api/admin/categories', methods=['GET', 'POST'])
@jwt_required()
def manage_categories():
    if request.method == 'GET':
        categories = SignCategory.query.all()
        return jsonify([{
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'created_at': category.created_at.strftime('%Y-%m-%d %H:%M:%S') if category.created_at else None
        } for category in categories])
    
    elif request.method == 'POST':
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'message': '分类名称不能为空'}), 400
        
        try:
            new_category = SignCategory(
                name=data['name'],
                description=data.get('description', '')
            )
            db.session.add(new_category)
            db.session.commit()
            return jsonify({
                'id': new_category.id,
                'name': new_category.name,
                'description': new_category.description,
                'created_at': new_category.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': '添加分类失败'}), 500

# 获取、更新、删除单个分类
@app.route('/api/admin/categories/<int:category_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_category(category_id):
    category = SignCategory.query.get_or_404(category_id)
    
    if request.method == 'GET':
        return jsonify({
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'created_at': category.created_at.strftime('%Y-%m-%d %H:%M:%S') if category.created_at else None
        })
    
    elif request.method == 'PUT':
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'message': '分类名称不能为空'}), 400
        
        try:
            category.name = data['name']
            category.description = data.get('description', category.description)
            db.session.commit()
            return jsonify({
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'created_at': category.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': '更新分类失败'}), 500
    
    elif request.method == 'DELETE':
        try:
            db.session.delete(category)
            db.session.commit()
            return jsonify({'message': '删除成功'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': '删除分类失败'}), 500

# 用户注册API
@app.route('/api/user/register', methods=['POST'])
def user_register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'message': 'All fields are required'}), 400
        
        # 检查用户名是否已存在
        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username already exists'}), 400
        
        # 检查邮箱是否已存在
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already exists'}), 400
        
        # 创建新用户（确保设置为普通用户）
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_password.decode('utf-8'),
            user_type='user'  # 明确设置为普通用户
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"Debug - 新用户注册成功: {username}, 类型: user")  # 添加调试信息
        return jsonify({'message': 'User registered successfully'}), 201
        
    except Exception as e:
        print(f"注册过程中出现错误: {str(e)}")
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

# 用户仪表盘页面
@app.route('/user/dashboard')
def user_dashboard_page():
    return send_from_directory('../front/html/user', 'dashboard.html')

# 用户管理API
@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        # 验证用户类型
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user or user.user_type != 'admin':
            return jsonify({'message': 'Unauthorized access'}), 401
        
        users = User.query.all()
        return jsonify([{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None
        } for user in users])
    except Exception as e:
        print(f"获取用户列表时出错: {str(e)}")
        return jsonify({'message': '获取用户列表失败'}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_user(user_id):
    try:
        # 验证用户类型
        current_user = get_jwt_identity()
        admin = User.query.filter_by(username=current_user).first()
        
        if not admin or admin.user_type != 'admin':
            return jsonify({'message': '未授权的访问'}), 401
        
        user = User.query.get_or_404(user_id)
        
        if request.method == 'GET':
            return jsonify({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None
            })
        
        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'message': '未提供任何数据'}), 400
            
            # 更新邮箱
            if 'email' in data:
                user.email = data['email']
            
            # 更新密码
            if 'password' in data:
                user.set_password(data['password'])
            
            # 更新用户类型（不允许管理员修改自己的类型）
            if 'user_type' in data and str(user_id) != str(admin.id):
                user.user_type = data['user_type']
            elif 'user_type' in data and str(user_id) == str(admin.id):
                return jsonify({'message': '不能修改自己的用户类型'}), 400
            
            db.session.commit()
            return jsonify({'message': '用户更新成功'})
        
        elif request.method == 'DELETE':
            # 不允许删除自己
            if user.id == admin.id:
                return jsonify({'message': '不能删除自己的账号'}), 400
            
            db.session.delete(user)
            db.session.commit()
            return jsonify({'message': '用户删除成功'})
            
    except Exception as e:
        print(f"管理用户时出错: {str(e)}")
        db.session.rollback()
        return jsonify({'message': '操作失败'}), 500

# 用户端静态文件路由
@app.route('/front/html/user/<path:filename>')
def user_html(filename):
    return send_from_directory('../front/html/user', filename)

@app.route('/front/js/user/<path:filename>')
def user_js(filename):
    return send_from_directory('../front/js/user', filename)

@app.route('/front/css/<path:filename>')
def css_files(filename):
    return send_from_directory('../front/css', filename)

# 管理员端静态文件路由
@app.route('/js/admin/<path:filename>')
def admin_static(filename):
    return send_from_directory('../front/js/admin', filename)

# CSS文件路由
@app.route('/css/<path:filename>')
def css_static(filename):
    return send_from_directory('../front/css', filename)

# 管理员登录API
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': '请提供登录信息'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'message': '用户名和密码不能为空'}), 400
        
        # 查找管理员用户
        user = User.query.filter_by(username=username).first()
        if not user or user.user_type != 'admin':
            return jsonify({'message': '用户名或密码错误'}), 401
        
        # 验证密码
        if user.check_password(password):
            # 创建访问令牌
            access_token = create_access_token(identity=username)
            return jsonify({
                'token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type
                }
            }), 200
        
        return jsonify({'message': '用户名或密码错误'}), 401
        
    except Exception as e:
        print(f"管理员登录过程中出现错误: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 用户登录API
@app.route('/api/user/login', methods=['POST'])
def user_login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': '请提供登录信息'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'message': '用户名和密码不能为空'}), 400
        
        # 查找普通用户
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'message': '用户名或密码错误'}), 401
        
        # 验证密码
        if user.check_password(password):
            # 创建访问令牌
            access_token = create_access_token(identity=username)
            return jsonify({
                'token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type
                }
            }), 200
        
        return jsonify({'message': '用户名或密码错误'}), 401
        
    except Exception as e:
        print(f"用户登录过程中出现错误: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 用户资料API
@app.route('/api/user/profile', methods=['GET', 'PUT'])
@jwt_required()
def user_profile_api():
    try:
        # 获取当前用户
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
        
        if request.method == 'GET':
            return jsonify({
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None
            })
        
        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'message': '没有提供数据'}), 400
            
            # 更新用户资料
            if 'username' in data:
                # 检查新用户名是否已存在
                existing_user = User.query.filter_by(username=data['username']).first()
                if existing_user and existing_user.id != user.id:
                    return jsonify({'message': '用户名已存在'}), 400
                user.username = data['username']
            
            if 'email' in data:
                # 检查新邮箱是否已存在
                existing_user = User.query.filter_by(email=data['email']).first()
                if existing_user and existing_user.id != user.id:
                    return jsonify({'message': '邮箱已存在'}), 400
                user.email = data['email']
            
            if 'password' in data and data['password']:
                # 更新密码
                hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
                user.password_hash = hashed_password.decode('utf-8')
            
            db.session.commit()
            return jsonify({'message': '资料更新成功'})
    
    except Exception as e:
        print(f"处理用户资料时出错: {str(e)}")
        db.session.rollback()
        return jsonify({'message': '服务器内部错误'}), 500

# 用户学习统计API
@app.route('/api/user/stats', methods=['GET'])
@jwt_required()
def user_stats():
    try:
        # 获取当前用户
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
        
        # 获取用户的学习统计
        # 1. 计算已学手语数（通过learning_progress表）
        total_signs = db.session.query(func.count(db.distinct(Sign.id)))\
            .join(Favorite, Sign.id == Favorite.sign_id)\
            .filter(Favorite.user_id == user.id)\
            .scalar() or 0
            
        # 2. 计算收藏数
        favorite_signs = Favorite.query.filter_by(user_id=user.id).count()
        
        # 3. 计算学习天数（通过visit_logs表统计不同的日期）
        learning_days = db.session.query(func.count(func.distinct(func.date(VisitLog.visit_time))))\
            .filter(VisitLog.user_id == user.id)\
            .scalar() or 0
        
        return jsonify({
            'total_signs': total_signs,  # 已学手语数
            'favorite_signs': favorite_signs,  # 收藏数
            'learning_days': learning_days  # 学习天数
        })
    
    except Exception as e:
        print(f"获取用户统计时出错: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 用户最近学习记录API
@app.route('/api/user/recent-signs', methods=['GET'])
@jwt_required()
def user_recent_signs():
    try:
        # 获取当前用户
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
        
        # 通过学习进度表查询最近学习的手语
        # 按last_practiced倒序排列，限制10条
        recent_signs = db.session.query(Sign, db.func.max(VisitLog.visit_time).label('last_practiced'))\
            .join(VisitLog, Sign.id == VisitLog.visit_page.contains(f'/sign/'))\
            .filter(VisitLog.user_id == user.id)\
            .group_by(Sign.id)\
            .order_by(db.desc('last_practiced'))\
            .limit(10).all()
        
        return jsonify([{
            'id': sign.id,
            'keyword': sign.keyword,
            'last_practiced': last_practiced.strftime('%Y-%m-%d %H:%M:%S')
        } for sign, last_practiced in recent_signs])
    
    except Exception as e:
        print(f"获取最近学习记录时出错: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 获取分类列表（用户端）
@app.route('/api/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        categories = SignCategory.query.all()
        return jsonify([{
            'id': category.id,
            'name': category.name,
            'description': category.description
        } for category in categories])
    except Exception as e:
        print(f"获取分类列表时出错: {str(e)}")
        return jsonify({'message': '获取分类列表失败'}), 500

# 获取手语列表（带分类筛选）
@app.route('/api/signs', methods=['GET'])
@jwt_required()
def get_signs():
    try:
        # 获取查询参数
        category_id = request.args.get('category')
        keyword = request.args.get('keyword')
        query = Sign.query

        # 只在有category_id时，先查分类名再查signs
        if category_id:
            category_obj = SignCategory.query.filter_by(id=category_id).first()
            if category_obj:
                query = query.filter_by(category=category_obj.name)
            else:
                # 没有该分类直接返回空
                return jsonify([])

        if keyword:
            query = query.filter(Sign.keyword.like(f'%{keyword}%'))

        # 执行查询
        signs = query.all()
        return jsonify([{
            'id': sign.id,
            'keyword': sign.keyword,
            'category': sign.category,
            'video_url': sign.video_url,
            'description': sign.description
        } for sign in signs])
    except Exception as e:
        print(f"获取手语列表时出错: {str(e)}")
        return jsonify({'message': '获取手语列表失败'}), 500

# 获取单个手语详情
@app.route('/api/signs/<int:sign_id>', methods=['GET'])
@jwt_required()
def get_sign_detail(sign_id):
    try:
        sign = Sign.query.get_or_404(sign_id)
        
        return jsonify({
            'id': sign.id,
            'keyword': sign.keyword,
            'category': sign.category,
            'video_url': sign.video_url,
            'description': sign.description
        })
    except Exception as e:
        print(f"获取手语详情时出错: {str(e)}")
        return jsonify({'message': '获取手语详情失败'}), 500

# 获取用户收藏列表
@app.route('/api/user/favorites', methods=['GET'])
@jwt_required()
def get_user_favorites():
    try:
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
            
        # 从favorites表中获取用户的收藏
        favorites = db.session.query(Sign).join(
            Favorite, Sign.id == Favorite.sign_id
        ).filter(
            Favorite.user_id == user.id
        ).all()
        
        return jsonify([{
            'id': sign.id,
            'keyword': sign.keyword,
            'category': sign.category,
            'video_url': sign.video_url,
            'description': sign.description
        } for sign in favorites])
    except Exception as e:
        print(f"获取用户收藏列表时出错: {str(e)}")
        return jsonify({'message': '获取收藏列表失败'}), 500

# 添加收藏
@app.route('/api/user/favorites/<int:sign_id>', methods=['POST'])
@jwt_required()
def add_favorite(sign_id):
    try:
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
            
        # 检查手语是否存在
        sign = Sign.query.get(sign_id)
        if not sign:
            return jsonify({'message': '手语不存在'}), 404
            
        # 检查是否已经收藏
        existing_favorite = Favorite.query.filter_by(
            user_id=user.id,
            sign_id=sign_id
        ).first()
        
        if existing_favorite:
            return jsonify({'message': '已经收藏过了'}), 400
            
        # 添加收藏
        new_favorite = Favorite(user_id=user.id, sign_id=sign_id)
        db.session.add(new_favorite)
        db.session.commit()
        
        return jsonify({'message': '收藏成功'}), 201
    except Exception as e:
        print(f"添加收藏时出错: {str(e)}")
        db.session.rollback()
        return jsonify({'message': '添加收藏失败'}), 500

# 取消收藏
@app.route('/api/user/favorites/<int:sign_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(sign_id):
    try:
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
            
        # 删除收藏记录
        favorite = Favorite.query.filter_by(
            user_id=user.id,
            sign_id=sign_id
        ).first()
        
        if not favorite:
            return jsonify({'message': '未找到收藏记录'}), 404
            
        db.session.delete(favorite)
        db.session.commit()
        
        return jsonify({'message': '取消收藏成功'})
    except Exception as e:
        print(f"取消收藏时出错: {str(e)}")
        db.session.rollback()
        return jsonify({'message': '取消收藏失败'}), 500

# 添加静态文件路由
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('../front/css', filename)

@app.route('/js/user/<path:filename>')
def serve_user_js(filename):
    return send_from_directory('../front/js/user', filename)

@app.route('/js/admin/<path:filename>')
def serve_admin_js(filename):
    return send_from_directory('../front/js/admin', filename)

# 搜索手语关键词
@app.route('/api/signs/search', methods=['GET'])
@jwt_required()
def search_signs():
    try:
        keyword = request.args.get('keyword', '')
        if not keyword:
            return jsonify({'message': '请提供搜索关键词'}), 400
            
        # 使用模糊匹配搜索
        signs = Sign.query.filter(
            Sign.keyword.like(f'%{keyword}%')
        ).all()
        
        # 如果没有找到匹配的手语
        if not signs:
            return jsonify({
                'message': '当前手语暂未录入系统，我们会尽快更新',
                'signs': []
            }), 200  # 返回200而不是404，因为这是预期的情况
        
        return jsonify({
            'signs': [{
                'id': sign.id,
                'text': sign.keyword,
                'category': sign.category,
                'description': sign.description
            } for sign in signs]
        })
        
    except Exception as e:
        print(f"搜索手语时出错: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 获取手语视频
@app.route('/api/signs/<int:sign_id>/video', methods=['GET'])
@jwt_required()
def get_sign_video(sign_id):
    try:
        sign = Sign.query.get_or_404(sign_id)
        if not sign.video_url:
            return jsonify({'message': '该手语暂无视频'}), 404
            
        return jsonify({
            'videoUrl': sign.video_url
        })
        
    except Exception as e:
        print(f"获取视频时出错: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 获取手语总数
@app.route('/api/signs/count', methods=['GET'])
@jwt_required()
def get_signs_count():
    try:
        count = Sign.query.count()
        return jsonify({
            'count': count
        })
    except Exception as e:
        print(f"获取手语总数时出错: {str(e)}")
        return jsonify({'message': '服务器内部错误'}), 500

# 更新学习进度
@app.route('/api/user/learning/<int:sign_id>', methods=['POST'])
@jwt_required()
def update_learning_progress(sign_id):
    try:
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
            
        # 检查手语是否存在
        sign = Sign.query.get(sign_id)
        if not sign:
            return jsonify({'message': '手语不存在'}), 404
        
        # 获取请求参数
        data = request.json
        status = data.get('status', 'learning')  # 默认为"正在学习"
        
        # 查询是否已存在学习记录
        progress = LearningProgress.query.filter_by(
            user_id=user.id,
            sign_id=sign_id
        ).first()
        
        if progress:
            # 更新状态和练习时间
            progress.status = status
            progress.last_practiced = datetime.utcnow()
        else:
            # 创建新记录
            progress = LearningProgress(
                user_id=user.id,
                sign_id=sign_id,
                status=status
            )
            db.session.add(progress)
        
        # 记录访问日志
        log = VisitLog(
            user_id=user.id,
            visit_time=datetime.utcnow(),
            ip_address=request.remote_addr,
            visit_page=f'/sign/{sign_id}'
        )
        db.session.add(log)
        
        db.session.commit()
        
        return jsonify({'message': '学习进度已更新'})
    except Exception as e:
        print(f"更新学习进度时出错: {str(e)}")
        db.session.rollback()
        return jsonify({'message': '更新学习进度失败'}), 500

# 获取学习进度
@app.route('/api/user/learning', methods=['GET'])
@jwt_required()
def get_learning_progress():
    try:
        current_user = get_jwt_identity()
        user = User.query.filter_by(username=current_user).first()
        
        if not user:
            return jsonify({'message': '用户不存在'}), 404
        
        # 获取用户的所有学习进度
        progress_list = db.session.query(
            LearningProgress, Sign
        ).join(
            Sign, LearningProgress.sign_id == Sign.id
        ).filter(
            LearningProgress.user_id == user.id
        ).all()
        
        return jsonify([{
            'id': sign.id,
            'keyword': sign.keyword,
            'status': progress.status,
            'last_practiced': progress.last_practiced.strftime('%Y-%m-%d %H:%M:%S')
        } for progress, sign in progress_list])
    except Exception as e:
        print(f"获取学习进度时出错: {str(e)}")
        return jsonify({'message': '获取学习进度失败'}), 500

# 手语识别API
@app.route('/api/sign-recognition', methods=['POST'])
@jwt_required()
def sign_recognition():
    try:
        # 获取发送的图片数据
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'message': '未提供图片数据'}), 400
        
        # 解析base64编码的图片
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        
        # 获取API密钥
        api_key = os.getenv('DOUBAO_API_KEY')
        if not api_key:
            return jsonify({'message': '缺少API配置'}), 500
        
        # 调用Doubao Vision API
        response = call_doubao_vision_api(image_bytes, api_key)
        
        # 返回识别结果
        return jsonify(response), 200
        
    except Exception as e:
        print(f"手语识别请求失败: {str(e)}")
        return jsonify({'message': '手语识别服务暂时不可用'}), 500

def call_doubao_vision_api(image_bytes, api_key):
    """调用Doubao Vision API进行手语识别"""
    try:
        # 准备请求图片数据
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # API接口地址
        url = "https://api.doubao.com/v1/vision/analysis"
        
        # 准备请求头和请求体
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        payload = {
            "model": "doubao-1.5-vision-lite", 
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请识别这张图片中的手语动作，只返回识别结果。如果是数字或常见手语，请告诉我它代表的含义。"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ]
        }
        
        # 发送请求
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        # 解析响应
        result = response.json()
        sign_text = extract_sign_recognition(result)
        
        return {
            'success': True,
            'result': sign_text,
            'raw_response': result  # 调试用，可以在生产环境中移除
        }
        
    except requests.exceptions.RequestException as e:
        print(f"API请求失败: {str(e)}")
        return {
            'success': False,
            'error': '无法连接到手语识别服务'
        }
    except Exception as e:
        print(f"手语识别处理失败: {str(e)}")
        return {
            'success': False,
            'error': '手语识别处理出错'
        }

def extract_sign_recognition(api_response):
    """从API响应中提取手语识别结果"""
    try:
        content = api_response.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        # 简单处理，获取识别的文本
        # 进一步处理逻辑可以根据API返回的实际结构调整
        
        return content.strip()
    except Exception as e:
        print(f"提取识别结果时出错: {str(e)}")
        return "无法识别手语"

# 添加 /api/ai-chat 路由，转发前端请求到 https://ark.cn-beijing.volces.com/api/v3/chat/completions，带上 API-KEY，返回原始响应。
@app.route('/api/ai-chat', methods=['POST'])
@jwt_required()
def ai_chat():
    data = request.get_json()
    api_key = 'a07fdff1-e053-4bb3-bea1-906e0a426c80'
    try:
        resp = requests.post(
            'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            json=data,
            timeout=20
        )
        print('AI-CHAT返回内容:', resp.text)
        return (resp.text, resp.status_code, resp.headers.items())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 确保上传目录存在
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=True) 