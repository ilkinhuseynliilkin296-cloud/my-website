const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

console.log('========== Global Mall 启动中 ==========');
console.log('1. 加载依赖...');

// 数据库模块
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data', 'mall.db');

// 确保data目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log('创建 data 目录...');
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('2. 连接数据库...');
const db = new sqlite3.Database(dbPath);

// 初始化表结构
db.serialize(() => {
  console.log('3. 创建数据表...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      nickname VARCHAR(50),
      country VARCHAR(50),
      balance DECIMAL(10,2) DEFAULT 0,
      income DECIMAL(10,2) DEFAULT 0,
      avatar VARCHAR(255),
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock INTEGER DEFAULT 0,
      category VARCHAR(50),
      image VARCHAR(255),
      commission DECIMAL(5,3) DEFAULT 0.100,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      commission DECIMAL(10,2) DEFAULT 0,
      address TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      amount DECIMAL(10,2) NOT NULL,
      type VARCHAR(20) DEFAULT 'commission',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);
});

// 数据库辅助函数
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

console.log('4. 创建 Express 应用...');
const app = express();
const PORT = 3000;
const SECRET_KEY = 'global-mall-secret-key-2024';

// 创建上传目录
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  console.log('创建 uploads 目录...');
  fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('5. 配置中间件...');

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

console.log('6. 配置上传...');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

console.log('7. 配置路由...');

// ============ 基本路由 ============

// 主页
app.get('/', (req, res) => {
  console.log('访问主页');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 管理后台
app.get('/admin', (req, res) => {
  console.log('访问管理后台');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 测试路由
app.get('/test', (req, res) => {
  res.json({ message: '✅ 服务器运行正常！', time: new Date().toISOString() });
});

// ============ API 路由 ============

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { phone, password, nickname, country } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const existingUser = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (phone, password, nickname, country, balance, income, is_admin) VALUES (?, ?, ?, ?, 0, 0, 0)',
      [phone, hashedPassword, nickname || '用户_' + phone, country || '中国']
    );
    
    res.json({ 
      success: true, 
      message: '注册成功',
      userId: result.lastID 
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const user = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '密码错误' });
    }
    
    const token = jwt.sign(
      { id: user.id, phone: user.phone, is_admin: user.is_admin },
      SECRET_KEY,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        balance: user.balance || 0,
        income: user.income || 0,
        country: user.country || '中国',
        is_admin: user.is_admin === 1
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取商品列表
app.get('/api/products', async (req, res) => {
  try {
    const products = await all('SELECT * FROM products WHERE status = 1 ORDER BY created_at DESC');
    res.json({ products, total: products.length });
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 获取商品详情
app.get('/api/product/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ? AND status = 1', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.json(product);
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

console.log('8. 启动服务器...');

// ============ 启动服务器 ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🚀 Global Mall 服务已启动！');
  console.log(`📱 前台: http://localhost:${PORT}`);
  console.log(`📊 后台: http://localhost:${PORT}/admin`);
  console.log(`🧪 测试: http://localhost:${PORT}/test`);
  console.log('========================================');
  console.log('📝 默认账号（需要先运行 npm run init-db）:');
  console.log('   管理员: 13800138000 / admin123');
  console.log('   测试用户: 13800138001 / user123');
  console.log('========================================');
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

console.log('========== 启动完成，等待连接 ==========');
