-- 创建手语类别表
create table sign_categories
(
    id          int auto_increment
        primary key,
    name        varchar(50)                         not null,
    description text                                null,
    created_at  timestamp default CURRENT_TIMESTAMP null,
    constraint name
        unique (name)
);

-- 创建手语表
create table signs
(
    id          int auto_increment
        primary key,
    keyword     varchar(50)                         not null,
    category    varchar(50)                         not null,
    video_url   varchar(200)                        null,
    description text                                null,
    created_at  timestamp default CURRENT_TIMESTAMP null
);

-- 创建用户表
create table users
(
    id            int auto_increment
        primary key,
    username      varchar(50)                         not null,
    password_hash varchar(255)                        not null,
    email         varchar(100)                        not null,
    user_type     enum('admin', 'user') default 'user' not null,
    created_at    timestamp default CURRENT_TIMESTAMP null,
    constraint email
        unique (email),
    constraint username
        unique (username)
);

-- 创建学习进度表
create table learning_progress (
    id int auto_increment primary key,
    user_id int not null,
    sign_id int not null,
    status enum('not_started', 'learning', 'completed') default 'not_started',
    last_practiced timestamp default CURRENT_TIMESTAMP,
    created_at timestamp default CURRENT_TIMESTAMP,
    foreign key (user_id) references users(id),
    foreign key (sign_id) references signs(id)
);

-- 创建收藏表
create table favorites (
    id int auto_increment primary key,
    user_id int not null,
    sign_id int not null,
    created_at timestamp default CURRENT_TIMESTAMP,
    foreign key (user_id) references users(id),
    foreign key (sign_id) references signs(id)
);

-- 插入手语类别数据
INSERT INTO sign_categories (name, description) VALUES
('人物关系', '包含各种人物关系的手语表达'),
('职业名称', '包含各种职业名称的手语表达'),
('基础数字', '包含基础数字的手语表达'),
('时间日期', '包含时间日期相关的手语表达'),
('常见食物', '包含常见食物的手语表达'),
('公共场所', '包含公共场所的手语表达'),
('交通出行', '包含交通出行相关的手语表达'),
('自然景观', '包含自然景观的手语表达'),
('日常用语', '包含日常用语的手语表达'),
('颜色类', '包含颜色相关的手语表达'),
('动作行为', '包含动作行为的手语表达'),
('其他', '其他类别的手语表达');

-- 插入管理员用户数据（密码为：admin123）
INSERT INTO users (username, password_hash, email, user_type) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LGy.MbhP.THWtQS4.', 'admin@example.com', 'admin'); 