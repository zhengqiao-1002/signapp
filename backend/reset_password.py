from app import app, db
from models import User
import bcrypt

def reset_admin_password(username, new_password):
    with app.app_context():
        user = User.query.filter_by(username=username, user_type='admin').first()
        if not user:
            print(f"找不到管理员用户: {username}")
            return False
        
        user.set_password(new_password)
        db.session.commit()
        print(f"密码重置成功！用户名: {username}")
        return True

if __name__ == '__main__':
    username = 'hushuyuan'
    new_password = 'admin123'  # 临时密码
    reset_admin_password(username, new_password) 