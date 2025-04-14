from app import app
from models import User

def check_users():
    with app.app_context():
        all_users = User.query.all()
        print("\n=== 用户数据检查 ===")
        print(f"总用户数: {len(all_users)}")
        
        normal_users = User.query.filter_by(user_type='user').all()
        print(f"普通用户数: {len(normal_users)}")
        
        admin_users = User.query.filter_by(user_type='admin').all()
        print(f"管理员数: {len(admin_users)}")
        
        print("\n详细用户列表:")
        for user in all_users:
            print(f"ID: {user.id}, 用户名: {user.username}, 类型: {user.user_type}, 邮箱: {user.email}")

if __name__ == '__main__':
    check_users() 