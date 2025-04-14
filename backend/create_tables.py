from app import app
from extensions import db
from models import User, Sign, SignCategory, VisitLog

def init_db():
    with app.app_context():
        # 创建所有表
        db.create_all()
        print("数据库表创建成功！")

if __name__ == '__main__':
    init_db() 