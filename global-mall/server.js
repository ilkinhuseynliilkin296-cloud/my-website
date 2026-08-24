const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./database');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'global-mall-secret-key-2024';

// 创建上传目录
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 添加详细日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public'), {
  fallthrough: true,
  index: false
}));

// 处理manifest.json
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// 处理favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// 处理根路径 - 提供index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 处理admin页面
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(session({
  secret: SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

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

// ============ API 路由 ============

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { phone, password, nickname, country } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const existingUser = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
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
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const user = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
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
    
    req.session.userId = user.id;
    
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
        is_admin: user.is_admin === 1,
        avatar: user.avatar || null
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
app.get('/api/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT id, phone, nickname, country, balance, income, avatar, is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      country: user.country || '中国',
      balance: user.balance || 0,
      income: user.income || 0,
      avatar: user.avatar || null,
      is_admin: user.is_admin === 1
    });
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
});

// 获取商品列表
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM products WHERE status = 1';
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const products = await db.all(sql, params);
    
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE status = 1';
    const countParams = [];
    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }
    if (search) {
      countSql += ' AND (title LIKE ? OR description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const countResult = await db.get(countSql, countParams);
    
    res.json({
      products,
      total: countResult?.total || 0,
      page: parseInt(page),
      totalPages: Math.ceil((countResult?.total || 0) / limit)
    });
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 获取商品详情
app.get('/api/product/:id', async (req, res) => {
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ? AND status = 1', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.json(product);
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// 创建订单
app.post('/api/order', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const { product_id, quantity = 1, address } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: '商品ID不能为空' });
    }
    
    const product = await db.get('SELECT * FROM products WHERE id = ? AND status = 1', [product_id]);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ error: '库存不足' });
    }
    
    const amount = product.price * quantity;
    const commission = amount * (product.commission || 0.1);
    
    const orderNumber = 'GM' + Date.now() + Math.floor(Math.random() * 1000);
    const result = await db.run(
      `INSERT INTO orders (order_number, user_id, product_id, quantity, amount, commission, address, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [orderNumber, decoded.id, product_id, quantity, amount, commission, address || '']
    );
    
    await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, product_id]);
    
    res.json({
      success: true,
      orderId: result.lastID,
      orderNumber,
      amount,
      commission
    });
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 获取订单列表
app.get('/api/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const { status } = req.query;
    
    let sql = 'SELECT o.*, p.title as product_title, p.image as product_image FROM orders o JOIN products p ON o.product_id = p.id WHERE o.user_id = ?';
    const params = [decoded.id];
    
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY o.created_at DESC';
    
    const orders = await db.all(sql, params);
    res.json(orders);
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 更新订单状态
app.put('/api/order/:id/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const { status } = req.body;
    
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的订单状态' });
    }
    
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    if (order.user_id !== decoded.id && (!user || user.is_admin !== 1)) {
      return res.status(403).json({ error: '无权限' });
    }
    
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新订单状态错误:', error);
    res.status(500).json({ error: '更新订单状态失败' });
  }
});

// ============ 后台管理 API ============

// 获取仪表盘数据
app.get('/api/dashboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    const todayOrders = await db.get(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')"
    );
    
    const todaySales = await db.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'"
    );
    
    const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const totalProducts = await db.get("SELECT COUNT(*) as count FROM products WHERE status = 1");
    const totalCommission = await db.get(
      "SELECT COALESCE(SUM(commission), 0) as total FROM orders WHERE status != 'cancelled'"
    );
    
    const recentOrders = await db.all(
      `SELECT o.*, u.nickname as user_name, p.title as product_title 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       JOIN products p ON o.product_id = p.id 
       ORDER BY o.created_at DESC LIMIT 10`
    );
    
    res.json({
      todayOrders: todayOrders?.count || 0,
      todaySales: todaySales?.total || 0,
      totalOrders: totalOrders?.count || 0,
      totalUsers: totalUsers?.count || 0,
      totalProducts: totalProducts?.count || 0,
      totalCommission: totalCommission?.total || 0,
      recentOrders
    });
  } catch (error) {
    console.error('获取仪表盘数据错误:', error);
    res.status(500).json({ error: '获取仪表盘数据失败' });
  }
});

// 商品管理 - 获取所有商品
app.get('/api/admin/products', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    const products = await db.all('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 商品管理 - 创建商品
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    const { title, description, price, stock, category, commission } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    
    if (!title || !price) {
      return res.status(400).json({ error: '商品名称和价格不能为空' });
    }
    
    await db.run(
      `INSERT INTO products (title, description, price, stock, category, image, commission, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [title, description || '', parseFloat(price), parseInt(stock) || 0, category || '', image, parseFloat(commission) || 0.1]
    );
    
    res.json({ success: true, message: '商品创建成功' });
  } catch (error) {
    console.error('创建商品错误:', error);
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 商品管理 - 更新商品
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    const { title, description, price, stock, category, commission, status } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : req.body.image;
    
    await db.run(
      `UPDATE products 
       SET title = ?, description = ?, price = ?, stock = ?, category = ?, image = ?, commission = ?, status = ?
       WHERE id = ?`,
      [title, description || '', parseFloat(price), parseInt(stock) || 0, category || '', image, parseFloat(commission) || 0.1, parseInt(status) || 1, req.params.id]
    );
    
    res.json({ success: true, message: '商品更新成功' });
  } catch (error) {
    console.error('更新商品错误:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 商品管理 - 删除商品
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '商品删除成功' });
  } catch (error) {
    console.error('删除商品错误:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

// 用户管理 - 获取所有用户
app.get('/api/admin/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    const users = await db.all('SELECT id, phone, nickname, country, balance, income, avatar, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 订单管理 - 获取所有订单
app.get('/api/admin/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: '无权限' });
    }
    
    const { status } = req.query;
    let sql = `SELECT o.*, u.nickname as user_name, u.phone as user_phone, p.title as product_title 
               FROM orders o 
               JOIN users u ON o.user_id = u.id 
               JOIN products p ON o.product_id = p.id`;
    const params = [];
    
    if (status) {
      sql += ' WHERE o.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY o.created_at DESC';
    
    const orders = await db.all(sql, params);
    res.json(orders);
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 404 处理 - 所有未匹配的路由返回 index.html（SPA支持）
app.use((req, res, next) => {
  // 如果是API请求，返回404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API not found' });
  }
  // 其他请求返回index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Global Mall 服务已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`📊 管理后台: http://localhost:${PORT}/admin.html`);
  console.log(`📁 上传目录: ${uploadDir}`);
});
