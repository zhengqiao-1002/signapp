from app import app, db
from models import User
import bcrypt

def create_test_user():
    with app.app_context():
        # 检查用户是否已存在
        if not User.query.filter_by(username='testuser').first():
            # 创建测试用户
            test_user = User(
                username='testuser',
                email='test@example.com',
                user_type='user'
            )
            test_user.set_password('123456')
            
            db.session.add(test_user)
            db.session.commit()
            print("测试用户创建成功！")
            print("用户名: testuser")
            print("密码: 123456")
        else:
            print("测试用户已存在！")
            print("用户名: testuser")
            print("密码: 123456")

if __name__ == '__main__':
    create_test_user() 