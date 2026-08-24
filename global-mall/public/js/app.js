// Global Mall - 主应用
class App {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.cartItems = [];
    this.products = [];
    this.currentProduct = null;
    this.page = 1;
    this.hasMore = true;
    this.isLoading = false;
    this.searchQuery = '';
    this.currentCategory = '';
    
    this.init();
  }
  
  async init() {
    // 初始化国际化
    await i18n.init();
    
    // 检查登录状态
    const token = localStorage.getItem('authToken');
    if (token) {
      API.setToken(token);
      try {
        const user = await API.getUser();
        if (user && user.id) {
          this.currentUser = user;
          this.showApp();
          this.loadHomeData();
          this.updateUserInfo();
        } else {
          this.showLogin();
        }
      } catch (e) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
    
    this.bindEvents();
    this.setupBanner();
  }
  
  // ===== 页面切换 =====
  showLogin() {
    document.getElementById('page-login').classList.add('active');
    document.getElementById('page-app').classList.remove('active');
  }
  
  showApp() {
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-app').classList.add('active');
  }
  
  switchTab(tab) {
    this.currentPage = tab;
    
    // 更新导航
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    
    // 更新页面
    document.querySelectorAll('.tab-page').forEach(el => {
      el.classList.toggle('active', el.id === `page-${tab}`);
    });
    
    // 加载对应数据
    if (tab === 'orders') this.loadOrders();
    if (tab === 'wallet') this.loadWallet();
    if (tab === 'profile') this.updateUserInfo();
  }
  
  // ===== 事件绑定 =====
  bindEvents() {
    // 登录切换
    document.querySelectorAll('.login-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isLogin = tab.dataset.tab === 'login';
        document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
        document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
      });
    });
    
    // 登录
    document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
    document.getElementById('login-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    document.getElementById('login-phone').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    // 注册
    document.getElementById('register-btn').addEventListener('click', () => this.handleRegister());
    
    // 语言切换
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        i18n.switchLanguage(btn.dataset.lang);
      });
    });
    document.getElementById('header-lang-btn')?.addEventListener('click', () => {
      // 显示语言切换弹窗
      this.showLangMenu();
    });
    
    // 底部导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.switchTab(item.dataset.tab);
      });
    });
    
    // 搜索
    document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
    document.getElementById('search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
    document.getElementById('search-input').addEventListener('input', (e) => {
      if (e.target.value === '') {
        this.searchQuery = '';
        this.page = 1;
        this.loadProducts();
      }
    });
    
    // 分类
    document.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentCategory = item.dataset.category;
        this.page = 1;
        this.loadProducts();
        document.getElementById('search-input').value = '';
        this.searchQuery = '';
      });
    });
    
    // 加载更多
    document.getElementById('load-more-btn').addEventListener('click', () => {
      if (this.hasMore && !this.isLoading) {
        this.page++;
        this.loadProducts(true);
      }
    });
    
    // 详情返回
    document.getElementById('detail-back').addEventListener('click', () => {
      this.switchTab('home');
    });
    
    // 立即购买
    document.getElementById('detail-buy').addEventListener('click', () => {
      this.handleBuyNow();
    });
    
    // 订单状态筛选
    document.querySelectorAll('.order-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.loadOrders(tab.dataset.status);
      });
    });
    
    // 钱包操作
    document.getElementById('wallet-recharge').addEventListener('click', () => {
      alert('充值功能开发中...');
    });
    document.getElementById('wallet-withdraw').addEventListener('click', () => {
      alert('提现功能开发中...');
    });
    
    // 个人中心菜单
    document.getElementById('profile-orders').addEventListener('click', () => {
      this.switchTab('orders');
    });
    document.getElementById('profile-wallet').addEventListener('click', () => {
      this.switchTab('wallet');
    });
    document.getElementById('profile-commission').addEventListener('click', () => {
      this.switchTab('wallet');
    });
    document.getElementById('profile-logout').addEventListener('click', () => {
      this.handleLogout();
    });
    document.getElementById('profile-admin').addEventListener('click', () => {
      window.location.href = '/admin.html';
    });
    
    // 商品卡片点击（事件委托）
    document.getElementById('product-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (card) {
        const id = card.dataset.id;
        this.showDetail(id);
      }
    });
    
    // 认证过期
    document.addEventListener('authExpired', () => {
      this.showLogin();
    });
    
    // 语言变化
    document.addEventListener('languageChanged', () => {
      this.updateUI();
    });
  }
  
  // ===== 登录处理 =====
  async handleLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    if (!phone || !password) {
      errorEl.textContent = '请输入手机号和密码';
      return;
    }
    
    try {
      errorEl.textContent = '';
      const result = await API.login(phone, password);
      if (result.success) {
        this.currentUser = result.user;
        this.showApp();
        this.loadHomeData();
        this.updateUserInfo();
        document.getElementById('login-phone').value = '';
        document.getElementById('login-password').value = '';
      } else {
        errorEl.textContent = result.error || '登录失败';
      }
    } catch (e) {
      errorEl.textContent = '网络错误，请稍后重试';
    }
  }
  
  // ===== 注册处理 =====
  async handleRegister() {
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value;
    const nickname = document.getElementById('register-nickname').value.trim() || '';
    const country = document.getElementById('register-country').value;
    const errorEl = document.getElementById('register-error');
    
    if (!phone || !password) {
      errorEl.textContent = '手机号和密码不能为空';
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = '密码至少6位';
      return;
    }
    
    try {
      errorEl.textContent = '';
      const result = await API.register(phone, password, nickname, country);
      if (result.success) {
        alert('注册成功！请登录');
        // 切换到登录
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.login-tab[data-tab="login"]').classList.add('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-phone').value = phone;
        document.getElementById('register-phone').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-nickname').value = '';
      } else {
        errorEl.textContent = result.error || '注册失败';
      }
    } catch (e) {
      errorEl.textContent = '网络错误，请稍后重试';
    }
  }
  
  // ===== 登出处理 =====
  handleLogout() {
    if (confirm('确定要退出登录吗？')) {
      API.setToken(null);
      this.currentUser = null;
      this.showLogin();
      document.querySelector('.login-tab[data-tab="login"]').click();
    }
  }
  
  // ===== 语言菜单 =====
  showLangMenu() {
    const langs = [
      { code: 'zh', name: '中文' },
      { code: 'ru', name: 'Русский' },
      { code: 'ky', name: 'Кыргызча' },
      { code: 'uz', name: "O'zbekcha" },
      { code: 'en', name: 'English' }
    ];
    const options = langs.map(l => 
      `${l.code}: ${l.name}`
    ).join('\n');
    const choice = prompt('选择语言 (Select Language):\n' + options, i18n.currentLang);
    if (choice && langs.some(l => l.code === choice)) {
      i18n.switchLanguage(choice);
    }
  }
  
  // ===== 加载首页数据 =====
  async loadHomeData() {
    this.page = 1;
    this.hasMore = true;
    this.currentCategory = '';
    this.searchQuery = '';
    document.getElementById('search-input').value = '';
    await this.loadProducts();
  }
  
  // ===== 加载商品 =====
  async loadProducts(append = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    
    try {
      const params = {
        page: this.page,
        limit: 20
      };
      if (this.currentCategory) params.category = this.currentCategory;
      if (this.searchQuery) params.search = this.searchQuery;
      
      const result = await API.getProducts(params);
      
      if (result.products && result.products.length > 0) {
        if (append) {
          this.products = [...this.products, ...result.products];
        } else {
          this.products = result.products;
        }
        this.hasMore = result.totalPages > this.page;
        this.renderProducts(this.products);
      } else {
        if (!append) {
          this.products = [];
          this.renderProducts([]);
        }
        this.hasMore = false;
      }
    } catch (e) {
      console.error('加载商品失败:', e);
    } finally {
      this.isLoading = false;
    }
  }
  
  // ===== 渲染商品 =====
  renderProducts(products) {
    const grid = document.getElementById('product-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1">
          <div class="empty-icon">📦</div>
          <p>暂无商品</p>
        </div>
      `;
      loadMoreBtn.style.display = 'none';
      return;
    }
    
    grid.innerHTML = products.map(p => `
      <div class="product-card" data-id="${p.id}">
        <img src="${p.image || 'https://picsum.photos/400/400?random=' + p.id}" alt="${p.title}" loading="lazy">
        <div class="product-card-info">
          <div class="product-card-title">${p.title}</div>
          <div class="product-card-price">¥${p.price.toFixed(2)}</div>
          <div class="product-card-stock">库存: ${p.stock}</div>
        </div>
      </div>
    `).join('');
    
    loadMoreBtn.style.display = this.hasMore ? 'inline-block' : 'none';
    loadMoreBtn.textContent = this.hasMore ? i18n.t('loadMore') || '加载更多' : i18n.t('noMore') || '没有更多了';
  }
  
  // ===== 搜索 =====
  handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
      this.searchQuery = query;
      this.currentCategory = '';
      this.page = 1;
      this.loadProducts();
    }
  }
  
  // ===== 商品详情 =====
  async showDetail(id) {
    try {
      const product = await API.getProduct(id);
      if (product && product.id) {
        this.currentProduct = product;
        this.renderDetail(product);
        this.switchTab('detail');
        document.getElementById('page-detail').classList.add('active');
      }
    } catch (e) {
      console.error('加载商品详情失败:', e);
    }
  }
  
  renderDetail(product) {
    document.getElementById('detail-img').src = product.image || 'https://picsum.photos/400/400?random=' + product.id;
    document.getElementById('detail-title').textContent = product.title;
    document.getElementById('detail-price').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('detail-stock').textContent = `库存: ${product.stock}`;
    document.getElementById('detail-commission').textContent = `佣金: ${(product.commission * 100).toFixed(1)}%`;
    document.getElementById('detail-desc').textContent = product.description || '暂无描述';
    document.getElementById('detail-buy').dataset.id = product.id;
  }
  
  // ===== 立即购买 =====
  async handleBuyNow() {
    if (!this.currentUser) {
      alert('请先登录');
      return;
    }
    const product = this.currentProduct;
    if (!product) return;
    
    const quantity = parseInt(prompt('请输入购买数量:', '1')) || 1;
    if (quantity <= 0) return;
    
    if (quantity > product.stock) {
      alert(`库存不足，当前库存: ${product.stock}`);
      return;
    }
    
    const address = prompt('请输入收货地址:');
    if (!address) return;
    
    try {
      const result = await API.createOrder(product.id, quantity, address);
      if (result.success) {
        alert(`订单创建成功！\n订单号: ${result.orderNumber}\n金额: ¥${result.amount.toFixed(2)}`);
        this.switchTab('orders');
        this.loadOrders();
      } else {
        alert(result.error || '下单失败');
      }
    } catch (e) {
      alert('网络错误，请稍后重试');
    }
  }
  
  // ===== 加载订单 =====
  async loadOrders(status = 'all') {
    const list = document.getElementById('order-list');
    list.innerHTML = '<div class="loading">加载中</div>';
    
    try {
      const orders = await API.getOrders(status === 'all' ? null : status);
      if (orders && orders.length > 0) {
        list.innerHTML = orders.map(order => `
          <div class="order-card">
            <div class="order-card-header">
              <span>${order.order_number}</span>
              <span>${new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div class="order-card-body">
              <img src="${order.product_image || 'https://picsum.photos/100/100?random=' + order.product_id}" alt="${order.product_title}">
              <div class="order-card-info">
                <div class="order-card-title">${order.product_title}</div>
                <div class="order-card-meta">数量: ${order.quantity}</div>
                <div class="order-card-amount">¥${order.amount.toFixed(2)}</div>
              </div>
              <div>
                <span class="order-card-status ${order.status}">${this.getStatusText(order.status)}</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无订单</p>
          </div>
        `;
      }
    } catch (e) {
      list.innerHTML = '<div class="loading">加载失败，请重试</div>';
    }
  }
  
  getStatusText(status) {
    const map = {
      pending: '待付款',
      paid: '已付款',
      shipped: '已发货',
      delivered: '已完成',
      cancelled: '已取消'
    };
    return map[status] || status;
  }
  
  // ===== 加载钱包 =====
  async loadWallet() {
    try {
      const user = await API.getUser();
      if (user) {
        document.getElementById('wallet-balance').textContent = `¥${(user.balance || 0).toFixed(2)}`;
        document.getElementById('wallet-income').textContent = `¥${(user.income || 0).toFixed(2)}`;
        this.loadEarnings();
      }
    } catch (e) {
      console.error('加载钱包失败:', e);
    }
  }
  
  // ===== 加载收益记录 =====
  async loadEarnings() {
    const container = document.getElementById('earnings-items');
    try {
      // 使用订单作为收益记录
      const orders = await API.getOrders();
      if (orders && orders.length > 0) {
        container.innerHTML = orders.map(order => `
          <div class="earning-item">
            <div>
              <div class="earning-desc">${order.product_title} 佣金</div>
              <div class="earning-date">${new Date(order.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="earning-amount">+¥${(order.commission || 0).toFixed(2)}</div>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">💰</div>
            <p>暂无收益记录</p>
          </div>
        `;
      }
    } catch (e) {
      container.innerHTML = '<div class="loading">加载失败</div>';
    }
  }
  
  // ===== 更新用户信息 =====
  async updateUserInfo() {
    if (!this.currentUser) {
      try {
        const user = await API.getUser();
        if (user) this.currentUser = user;
      } catch (e) {
        return;
      }
    }
    
    if (this.currentUser) {
      document.getElementById('profile-name').textContent = this.currentUser.nickname || '用户';
      document.getElementById('profile-phone').textContent = this.currentUser.phone || '';
      document.getElementById('profile-country').textContent = this.currentUser.country || '中国';
      document.getElementById('profile-avatar').textContent = this.currentUser.avatar || '👤';
      
      // 显示管理员入口
      const adminEntry = document.getElementById('profile-admin');
      if (this.currentUser.is_admin) {
        adminEntry.style.display = 'flex';
      } else {
        adminEntry.style.display = 'none';
      }
    }
  }
  
  // ===== 轮播图 =====
  setupBanner() {
    const track = document.getElementById('banner-track');
    const dots = document.getElementById('banner-dots');
    let currentIndex = 0;
    const items = track.querySelectorAll('.banner-item');
    const total = items.length;
    
    if (total === 0) return;
    
    // 创建圆点
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      if (i === 0) dot.classList.add('active');
      dots.appendChild(dot);
    }
    
    function goTo(index) {
      currentIndex = (index + total) % total;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.querySelectorAll('span').forEach((d, i) => {
        d.classList.toggle('active', i === currentIndex);
      });
    }
    
    // 自动轮播
    let interval = setInterval(() => goTo(currentIndex + 1), 3000);
    
    // 触摸支持
    let startX = 0;
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      clearInterval(interval);
    });
    track.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 30) {
        goTo(currentIndex + (diff > 0 ? 1 : -1));
      }
      interval = setInterval(() => goTo(currentIndex + 1), 3000);
    });
  }
  
  // ===== UI 更新 =====
  updateUI() {
    // 重新渲染当前页面数据
    if (this.currentPage === 'home') {
      this.renderProducts(this.products);
    } else if (this.currentPage === 'orders') {
      this.loadOrders();
    } else if (this.currentPage === 'wallet') {
      this.loadWallet();
    }
  }
}

// ===== 启动应用 =====
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
