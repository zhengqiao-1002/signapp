from extensions import db
from datetime import datetime
from sqlalchemy import TIMESTAMP, Enum
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    user_type = db.Column(db.String(20), default='user')  # 'admin' 或 'user'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        """设置用户密码"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

class SignCategory(db.Model):
    __tablename__ = 'sign_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(TIMESTAMP, server_default=db.text('CURRENT_TIMESTAMP'))

class Sign(db.Model):
    __tablename__ = 'signs'
    
    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    video_url = db.Column(db.String(200))
    description = db.Column(db.Text)
    created_at = db.Column(TIMESTAMP, server_default=db.text('CURRENT_TIMESTAMP'))

class VisitLog(db.Model):
    __tablename__ = 'visit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # 可以为空，表示未登录访问
    visit_time = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))  # 记录访问IP
    visit_page = db.Column(db.String(100))  # 记录访问的页面 

class Favorite(db.Model):
    """用户收藏的手语"""
    __tablename__ = 'favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sign_id = db.Column(db.Integer, db.ForeignKey('signs.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 建立与User和Sign模型的关系
    user = db.relationship('User', backref=db.backref('favorites', lazy=True))
    sign = db.relationship('Sign', backref=db.backref('favorited_by', lazy=True))

    def __repr__(self):
        return f'<Favorite {self.user_id}-{self.sign_id}>'
        
class LearningProgress(db.Model):
    """用户学习进度"""
    __tablename__ = 'learning_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sign_id = db.Column(db.Integer, db.ForeignKey('signs.id'), nullable=False)
    status = db.Column(Enum('not_started', 'learning', 'completed', name='learning_status'), default='not_started')
    last_practiced = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 建立与User和Sign模型的关系
    user = db.relationship('User', backref=db.backref('learning_progress', lazy=True))
    sign = db.relationship('Sign', backref=db.backref('learned_by', lazy=True))
    
    def __repr__(self):
        return f'<LearningProgress {self.user_id}-{self.sign_id}: {self.status}>' 