import os
from dotenv import load_dotenv

load_dotenv()

# 数据库配置
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'sign_language_db')

# JWT配置
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')

# 阿里云OSS配置
OSS_ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID')
OSS_ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET')
OSS_BUCKET_NAME = os.getenv('OSS_BUCKET_NAME')
OSS_ENDPOINT = os.getenv('OSS_ENDPOINT')  # 例如：'oss-cn-beijing.aliyuncs.com'
OSS_BUCKET_DOMAIN = os.getenv('OSS_BUCKET_DOMAIN')  # 您的 Bucket 访问域名

# API密钥配置
DOUBAO_API_KEY = os.getenv('DOUBAO_API_KEY', 'a07fdff1-e053-4bb3-bea1-906e0a426c80')  # 豆包API密钥 