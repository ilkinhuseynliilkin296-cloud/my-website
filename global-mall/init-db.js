const db = require('./database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 创建管理员账户
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      `INSERT OR IGNORE INTO users (phone, password, nickname, is_admin)
       VALUES ('13800138000', ?, '系统管理员', 1)`,
      [adminPassword]
    );
    console.log('✅ 管理员账户已创建 (手机号: 13800138000, 密码: admin123)');
    
    // 创建测试用户
    const userPassword = await bcrypt.hash('user123', 10);
    await db.run(
      `INSERT OR IGNORE INTO users (phone, password, nickname, is_admin)
       VALUES ('13800138001', ?, '测试用户', 0)`,
      [userPassword]
    );
    console.log('✅ 测试用户已创建 (手机号: 13800138001, 密码: user123)');
    
    // 插入示例商品
    const products = [
      {
        name: 'iPhone 15 Pro Max',
        description: 'Apple iPhone 15 Pro Max 256GB 深空黑色 5G手机',
        price: 9999.00,
        stock: 50,
        category: '电子产品',
        image: 'https://picsum.photos/400/400?random=1',
        shipping_fee: 0
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: '三星Galaxy S24 Ultra 256GB 钛灰色 5G手机',
        price: 8999.00,
        stock: 30,
        category: '电子产品',
        image: 'https://picsum.photos/400/400?random=2',
        shipping_fee: 0
      },
      {
