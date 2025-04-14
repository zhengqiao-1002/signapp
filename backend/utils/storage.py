import os
import oss2
from datetime import datetime
from config import (
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET_NAME,
    OSS_ENDPOINT,
    OSS_BUCKET_DOMAIN
)

class Storage:
    def __init__(self):
        self.auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
        self.bucket = oss2.Bucket(self.auth, OSS_ENDPOINT, OSS_BUCKET_NAME)
        self.domain = OSS_BUCKET_DOMAIN

    def upload_file(self, file, folder='videos'):
        """
        上传文件到OSS
        :param file: FileStorage对象
        :param folder: 存储的文件夹名
        :return: 文件的访问URL
        """
        try:
            # 生成唯一的文件名
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{file.filename}"
            object_name = f"{folder}/{filename}"

            # 上传文件
            self.bucket.put_object(object_name, file.stream)

            # 返回文件的访问URL
            return f"https://{self.domain}/{object_name}"
        except Exception as e:
            print(f"Upload error: {str(e)}")
            raise

    def delete_file(self, file_url):
        """
        从OSS删除文件
        :param file_url: 文件的URL
        """
        try:
            # 从URL中提取对象名称
            object_name = file_url.split(self.domain + '/')[-1]
            self.bucket.delete_object(object_name)
            return True
        except Exception as e:
            print(f"Delete error: {str(e)}")
            return False 