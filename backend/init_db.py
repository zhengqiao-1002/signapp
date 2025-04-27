cdfrom app import app, db
from models import User, SignCategory, Sign
import bcrypt

def init_db():
    with app.app_context():
        # 创建默认管理员用户
        if not User.query.filter_by(username='hushuyuan').first():
            password_hash = bcrypt.hashpw('hsy0124'.encode('utf-8'), bcrypt.gensalt())
            admin = User(
                username='hushuyuan',
                password_hash=password_hash.decode('utf-8'),
                email='hushuyuan_1006@qq.com',
                user_type='admin'  # 设置为管理员
            )
            db.session.add(admin)
            db.session.commit()
            print("管理员账号创建成功！")
            print("用户名: hushuyuan")
            print("密码: hsy0124")
        else:
            print("管理员账号已存在")

        # 创建默认分类
        categories = [
            ('人物关系', '包含各种人物关系的手语'),
            ('职业名称', '包含各种职业名称的手语'),
            ('基础数字', '包含基础数字的手语'),
            ('时间日期', '包含时间日期相关的手语'),
            ('常见食物', '包含常见食物的手语'),
            ('公共场所', '包含公共场所相关的手语'),
            ('交通出行', '包含交通出行相关的手语'),
            ('自然景观', '包含自然景观相关的手语'),
            ('日常用语', '包含日常用语的手语'),
            ('颜色类', '包含颜色相关的手语'),
            ('动作行为', '包含动作行为相关的手语')
        ]
        
        for name, description in categories:
            if not SignCategory.query.filter_by(name=name).first():
                category = SignCategory(name=name, description=description)
                db.session.add(category)
        
        db.session.commit()
        print("分类初始化完成！")

if __name__ == '__main__':
    init_db() 