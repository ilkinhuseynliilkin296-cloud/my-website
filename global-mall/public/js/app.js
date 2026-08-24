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
      <div class="product
