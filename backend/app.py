from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta, datetime, date
import os
from dotenv import load_dotenv
import bcrypt
from sqlalchemy import func
from collections import defaultdict

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

# 配置Flask应用
app = Flask(__name__)

# 配置静态文件路径
app.static_folder = '../front'  # 设置静态文件夹路径
app.static_url_path = '/static'  # 设置静态文件URL前缀

CORS(app)

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
from models import User, Sign, SignCategory, VisitLog

# 请求中间件，记录所有访问
@app.before_request
def log_request():
    # 忽略静态文件和API请求
    if not request.path.startswith('/static') and not request.path.startswith('/uploads') and not request.path.startswith('/api/'):
        reset_counter_if_needed()
        visit_counter[get_today_date()] += 1

# 处理上传的文件
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 根路由
@app.route('/')
def index():
    return send_from_directory('../front/html/user', 'index.html')

# 用户首页
@app.route('/index.html')
def user_index():
    return send_from_directory('../front/html/user', 'index.html')

# 管理员登录页面
@app.route('/admin/login')
def admin_login_page():
    return send_from_directory('../front/html/admin', 'login.html')

# 管理员仪表盘页面
@app.route('/admin/dashboard')
def admin_dashboard_page():
    return send_from_directory('../front/html/admin', 'dashboard.html')

# 管理员登录API
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'message': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=username, user_type='admin').first()
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if user.check_password(password):
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
        
        return jsonify({'message': 'Invalid credentials'}), 401
        
    except Exception as e:
        print(f"管理员登录过程中出现错误: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

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

# 用户登录页面
@app.route('/user/login')
@app.route('/user/login.html')
def user_login_page():
    return send_from_directory('../front/html/user', 'login.html')

# 用户注册页面
@app.route('/user/register')
@app.route('/user/register.html')
def user_register_page():
    return send_from_directory('../front/html/user', 'register.html')

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
@app.route('/js/user/<path:filename>')
def user_static(filename):
    return send_from_directory('../front/js/user', filename)

# 管理员端静态文件路由
@app.route('/js/admin/<path:filename>')
def admin_static(filename):
    return send_from_directory('../front/js/admin', filename)

# CSS文件路由
@app.route('/css/<path:filename>')
def css_static(filename):
    return send_from_directory('../front/css', filename)

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

if __name__ == '__main__':
    # 确保上传目录存在
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=True) 