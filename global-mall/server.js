const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'global-mall-secret-key-2024';

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

// ===== 用户相关 =====

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const existingUser = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (phone, password, nickname, balance, is_admin) VALUES (?, ?, ?, 0, 0)',
      [phone, hashedPassword, nickname || '用户_' + phone]
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
    const user = await db.get('SELECT id, phone, nickname, balance, avatar, is_admin FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      balance: user.balance || 0,
      avatar: user.avatar || null,
      is_admin: user.is_admin === 1
    });
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
});

// ===== 商品相关 =====

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
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const products = await db.all(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE status = 1';
    const countParams = [];
    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }
    if (search) {
      countSql += ' AND (name LIKE ? OR description LIKE ?)';
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
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.json(product);
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// 获取商品分类
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT DISTINCT category FROM products WHERE status = 1');
    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('获取分类错误:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ===== 购物车相关 =====

// 获取购物车
app.get('/api/cart', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const items = await db.all(`
      SELECT c.*, p.name, p.price, p.image, p.stock, p.shipping_fee
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [decoded.id]);
    
    res.json(items);
  } catch (error) {
    console.error('获取购物车错误:', error);
    res.status(500).json({ error: '获取购物车失败' });
  }
});

// 添加购物车
app.post('/api/cart', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const { product_id, quantity = 1 } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: '商品ID不能为空' });
    }
    
    // 检查商品是否存在
    const product = await db.get('SELECT * FROM products WHERE id = ? AND status = 1', [product_id]);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查库存
    if (product.stock < quantity) {
      return res.status(400).json({ error: '库存不足' });
    }
    
    // 检查是否已在购物车
    const existing = await db.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [decoded.id, product_id]);
    
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: '库存不足' });
      }
      await db.run('UPDATE cart SET quantity = ? WHERE id = ?', [newQuantity, existing.id]);
    } else {
      await db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [decoded.id, product_id, quantity]);
    }
    
    res.json({ success: true, message: '已添加到购物车' });
  } catch (error) {
    console.error('添加购物车错误:', error);
    res.status(500).json({ error: '添加购物车失败' });
  }
});

// 更新购物车数量
app.put('/api/cart/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const { quantity } = req.body;
    
    if (quantity <= 0) {
      await db.run('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, decoded.id]);
    } else {
      await db.run('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, decoded.id]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新购物车错误:', error);
    res.status(500).json({ error: '更新购物车失败' });
  }
});

// 删除购物车项
app.delete('/api/cart/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    await db.run('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, decoded.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除购物车错误:', error);
    res.status(500).json({ error: '删除购物车失败' });
  }
});

// ===== 订单相关 =====

// 创建订单
app.post('/api/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const { cart_items, address, note } = req.body;
    
    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({ error: '购物车为空' });
    }
    
    // 计算总价
    let totalAmount = 0;
    let shippingFee = 0;
    const orderItems = [];
    
    for (const item of cart_items) {
      const product = await db.get('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!product || product.status !== 1) {
        return res.status(400).json({ error: `商品 ${item.product_id} 不可用` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `${product.name} 库存不足` });
      }
      
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      shippingFee += product.shipping_fee || 0;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal
      });
    }
    
    totalAmount += shippingFee;
    
    // 创建订单
    const orderNumber = 'GM' + Date.now() + Math.floor(Math.random() * 1000);
    const result = await db.run(
      `INSERT INTO orders (order_number, user_id, total_amount, shipping_fee, address, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [orderNumber, decoded.id, totalAmount, shippingFee, address || '', note || '']
    );
    
    const orderId = result.lastID;
    
    // 创建订单项
    for (const item of orderItems) {
      await db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.price, item.quantity, item.subtotal]
      );
      
      // 扣减库存
      await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    
    // 清空购物车
    for (const item of cart_items) {
      await db.run('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [decoded.id, item.product_id]);
    }
    
    res.json({
      success: true,
      orderId,
      orderNumber,
      totalAmount
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
    
    let sql = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [decoded.id];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const orders = await db.all(sql, params);
    
    // 获取每个订单的详情
    for (const order of orders) {
      const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    
    res.json(orders);
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 更新订单状态
app.put('/api/orders/:id/status', async (req, res) => {
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
    
    await db.run('UPDATE orders SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, decoded.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新订单状态错误:', error);
    res.status(500).json({ error: '更新订单状态失败' });
  }
});

// ===== 商户后台相关 =====

// 获取商户商品列表
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
    console.error('获取商户商品列表错误:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 发布商品
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
    
    const { name, description, price, stock, category, shipping_fee } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    
    if (!name || !price) {
      return res.status(400).json({ error: '商品名称和价格不能为空' });
    }
    
    await db.run(
      `INSERT INTO products (name, description, price, stock, category, image, shipping_fee, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [name, description || '', parseFloat(price), parseInt(stock) || 0, category || '', image, parseFloat(shipping_fee) || 0]
    );
    
    res.json({ success: true, message: '商品发布成功' });
  } catch (error) {
    console.error('发布商品错误:', error);
    res.status(500).json({ error: '发布商品失败' });
  }
});

// 更新商品
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
    
    const { name, description, price, stock, category, shipping_fee, status } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : req.body.image;
    
    await db.run(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, stock = ?, category = ?, image = ?, shipping_fee = ?, status = ?
       WHERE id = ?`,
      [name, description || '', parseFloat(price), parseInt(stock) || 0, category || '', image, parseFloat(shipping_fee) || 0, parseInt(status) || 1, req.params.id]
    );
    
    res.json({ success: true, message: '商品更新成功' });
  } catch (error) {
    console.error('更新商品错误:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品
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

// 获取所有用户（商户管理）
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
    
    const users = await db.all('SELECT id, phone, nickname, balance, avatar, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取商户统计数据
app.get('/api/admin/stats', async (req, res) => {
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
    
    // 今日订单数
    const todayOrders = await db.get(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')"
    );
    
    // 今日销售额
    const todaySales = await db.get(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'"
    );
    
    // 总订单数
    const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
    
    // 总用户数
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    
    // 总商品数
    const totalProducts = await db.get("SELECT COUNT(*) as count FROM products WHERE status = 1");
    
    // 佣金统计（假设佣金率为10%）
    const commission = await db.get(
      "SELECT COALESCE(SUM(total_amount * 0.1), 0) as total FROM orders WHERE status != 'cancelled'"
    );
    
    res.json({
      todayOrders: todayOrders?.count || 0,
      todaySales: todaySales?.total || 0,
      totalOrders: totalOrders?.count || 0,
      totalUsers: totalUsers?.count || 0,
      totalProducts: totalProducts?.count || 0,
      commission: commission?.total || 0
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// ===== 收益相关 =====

// 获取收益记录
app.get('/api/earnings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // 获取用户的佣金收益（假设用户购买时产生佣金）
    const earnings = await db.all(
      `SELECT o.id, o.order_number, o.total_amount, o.created_at,
       o.total_amount * 0.1 as commission
       FROM orders o
       WHERE o.user_id = ? AND o.status != 'cancelled'
       ORDER BY o.created_at DESC`,
      [decoded.id]
    );
    
    // 计算总收益
    const totalEarnings = earnings.reduce((sum, e) => sum + e.commission, 0);
    
    res.json({
      totalEarnings,
      records: earnings
    });
  } catch (error) {
    console.error('获取收益记录错误:', error);
    res.status(500).json({ error: '获取收益记录失败' });
  }
});

// 获取钱包余额
app.get('/api/wallet', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.id]);
    
    res.json({ balance: user?.balance || 0 });
  } catch (error) {
    console.error('获取钱包错误:', error);
    res.status(500).json({ error: '获取钱包信息失败' });
  }
});

// ===== 轮播图相关 =====

// 获取轮播图
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await db.all('SELECT * FROM banners WHERE status = 1 ORDER BY sort_order ASC');
    res.json(banners);
  } catch (error) {
    console.error('获取轮播图错误:', error);
    res.status(500).json({ error: '获取轮播图失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Global Mall 服务已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`📊 商户后台: http://localhost:${PORT}/admin.html`);
});

// 创建上传目录
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
