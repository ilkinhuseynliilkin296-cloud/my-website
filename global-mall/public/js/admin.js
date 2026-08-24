// Global Mall - 管理后台
class AdminApp {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'dashboard';
    this.editingProductId = null;
    
    this.init();
  }
  
  async init() {
    // 检查登录状态
    const token = localStorage.getItem('authToken');
    if (token) {
      API.setToken(token);
      try {
        const user = await API.getUser();
        if (user && user.is_admin) {
          this.currentUser = user;
          this.showAdminApp();
          this.loadDashboard();
          this.bindEvents();
          return;
        }
      } catch (e) {
        // 继续显示登录
      }
    }
    
    this.showLogin();
    this.bindEvents();
  }
  
  showLogin() {
    document.getElementById('admin-login').style.display = 'flex';
    document.getElementById('admin-app').style.display = 'none';
  }
  
  showAdminApp() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    document.getElementById('admin-user-name').textContent = this.currentUser?.nickname || '管理员';
  }
  
  bindEvents() {
    // 登录
    document.getElementById('admin-login-btn').addEventListener('click', () => this.handleLogin());
    document.getElementById('admin-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    // 退出
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
      if (confirm('确定要退出吗？')) {
        API.setToken(null);
        this.currentUser = null;
        this.showLogin();
      }
    });
    
    // 导航切换
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.switchSection(item.dataset.section);
      });
    });
    
    // 添加商品
    document.getElementById('add-product-btn').addEventListener('click', () => {
      this.editingProductId = null;
      document.getElementById('product-modal-title').textContent = '添加商品';
      document.getElementById('product-form').reset();
      document.getElementById('product-id').value = '';
      document.getElementById('product-image-url').value = '';
      document.getElementById('product-image-preview').innerHTML = '';
      document.getElementById('product-modal').style.display = 'flex';
    });
    
    // 关闭弹窗
    document.getElementById('product-modal-close').addEventListener('click', () => {
      document.getElementById('product-modal').style.display = 'none';
    });
    document.getElementById('product-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('product-modal').style.display = 'none';
      }
    });
    
    // 商品表单提交
    document.getElementById('product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProduct();
    });
    
    // 订单筛选
    document.getElementById('admin-order-filter').addEventListener('change', (e) => {
      this.loadOrders(e.target.value);
    });
    
    // 图片预览
    document.getElementById('product-image').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          document.getElementById('product-image-preview').innerHTML = 
            `<img src="${ev.target.result}" alt="预览">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // ===== 登录处理 =====
  async handleLogin() {
    const phone = document.getElementById('admin-phone').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');
    
    if (!phone || !password) {
      errorEl.textContent = '请输入手机号和密码';
      return;
    }
    
    try {
      errorEl.textContent = '';
      const result = await API.login(phone, password);
      if (result.success && result.user.is_admin) {
        this.currentUser = result.user;
        this.showAdminApp();
        this.loadDashboard();
        document.getElementById('admin-phone').value = '';
        document.getElementById('admin-password').value = '';
      } else {
        errorEl.textContent = result.error || '登录失败，请检查账号权限';
      }
    } catch (e) {
      errorEl.textContent = '网络错误，请稍后重试';
    }
  }
  
  // ===== 切换模块 =====
  switchSection(section) {
    this.currentSection = section;
    document.querySelectorAll('.admin-section').forEach(el => {
      el.classList.toggle('active', el.id === `admin-${section}`);
    });
    
    switch (section) {
      case 'dashboard': this.loadDashboard(); break;
      case 'products': this.loadProducts(); break;
      case 'orders': this.loadOrders(); break;
      case 'users': this.loadUsers(); break;
    }
  }
  
  // ===== 仪表盘 =====
  async loadDashboard() {
    try {
      const data = await API.getDashboard();
      if (data) {
        document.getElementById('stat-today-orders').textContent = data.todayOrders || 0;
        document.getElementById('stat-today-sales').textContent = `¥${(data.todaySales || 0).toFixed(2)}`;
        document.getElementById('stat-total-orders').textContent = data.totalOrders || 0;
        document.getElementById('stat-total-users').textContent = data.totalUsers || 0;
        document.getElementById('stat-total-products').textContent = data.totalProducts || 0;
        document.getElementById('stat-total-commission').textContent = `¥${(data.totalCommission || 0).toFixed(2)}`;
        
        this.renderRecentOrders(data.recentOrders || []);
      }
    } catch (e) {
      console.error('加载仪表盘失败:', e);
    }
  }
  
  renderRecentOrders(orders) {
    const list = document.getElementById('recent-orders-list');
    if (orders.length === 0) {
      list.innerHTML = '<p style="color: var(--gray-400); text-align:center;padding:20px;">暂无订单</p>';
      return;
    }
    list.innerHTML = orders.map(order => `
      <div class="recent-order-item">
        <div class="order-info">
          <div class="order-id">${order.order_number}</div>
          <div class="order-user">${order.user_name || '用户'} - ${order.product_title || ''}</div>
        </div>
        <div class="order-amount">¥${(order.amount || 0).toFixed(2)}</div>
      </div>
    `).join('');
  }
  
  // ===== 商品管理 =====
  async loadProducts() {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">加载中...</td></tr>';
    
    try {
      const products = await API.getAdminProducts();
      if (products && products.length > 0) {
        tbody.innerHTML = products.map(p => `
          <tr>
            <td>${p.id}</td>
            <td><img src="${p.image || 'https://picsum.photos/50/50?random=' + p.id}" alt="${p.title}"></td>
            <td>${p.title}</td>
            <td>¥${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>${(p.commission * 100).toFixed(1)}%</td>
            <td><span class="status-badge ${p.status === 1 ? 'active' : 'inactive'}">${p.status === 1 ? '上架' : '下架'}</span></td>
            <td>
              <button class="btn-edit" data-id="${p.id}">编辑</button>
              <button class="btn-delete" data-id="${p.id}">删除</button>
            </td>
          </tr>
        `).join('');
        
        // 绑定编辑事件
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
          btn.addEventListener('click', () => this.editProduct(btn.dataset.id));
        });
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
          btn.addEventListener('click', () => this.deleteProduct(btn.dataset.id));
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray-400);padding:30px;">暂无商品</td></tr>';
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">加载失败</td></tr>';
    }
  }
  
  async editProduct(id) {
    try {
      const products = await API.getAdminProducts();
      const product = products.find(p => p.id === parseInt(id));
      if (!product) return;
      
      this.editingProductId = product.id;
      document.getElementById('product-modal-title').textContent = '编辑商品';
      document.getElementById('product-id').value = product.id;
      document.getElementById('product-title').value = product.title || '';
      document.getElementById('product-desc').value = product.description || '';
      document.getElementById('product-price').value = product.price || '';
      document.getElementById('product-stock').value = product.stock || 0;
      document.getElementById('product-category').value = product.category || '';
      document.getElementById('product-commission').value = (product.commission || 0.1) * 100;
      document.getElementById('product-status').value = product.status || 1;
      document.getElementById('product-image-url').value = product.image || '';
      
      if (product.image) {
        document.getElementById('product-image-preview').innerHTML = 
          `<img src="${product.image}" alt="当前图片">`;
      }
      
      document.getElementById('product-modal').style.display = 'flex';
    } catch (e) {
      alert('加载商品失败');
    }
  }
  
  async deleteProduct(id) {
    if (!confirm('确定要删除该商品吗？')) return;
    
    try {
      const result = await API.deleteAdminProduct(id);
      if (result.success) {
        alert('删除成功');
        this.loadProducts();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (e) {
      alert('网络错误，请稍后重试');
    }
  }
  
  async saveProduct() {
    const id = document.getElementById('product-id').value;
    const title = document.getElementById('product-title').value.trim();
    const description = document.getElementById('product-desc').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    const category = document.getElementById('product-category').value.trim();
    const commission = parseFloat(document.getElementById('product-commission').value) / 100 || 0.1;
    const status = parseInt(document.getElementById('product-status').value);
    const imageFile = document.getElementById('product-image').files[0];
    const imageUrl = document.getElementById('product-image-url').value;
    
    if (!title || !price || price <= 0) {
      alert('请填写完整的商品信息（名称和价格）');
      return;
    }
    
    try {
      let result;
      
      if (id) {
        // 编辑
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('stock', stock);
        formData.append('category', category);
        formData.append('commission', commission);
        formData.append('status', status);
        formData.append('image', imageUrl);
        if (imageFile) {
          formData.append('image', imageFile);
        }
        result = await API.updateAdminProductForm(id, formData);
      } else {
        // 新增
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('stock', stock);
        formData.append('category', category);
        formData.append('commission', commission);
        if (imageFile) {
          formData.append('image', imageFile);
        }
        result = await API.createAdminProductForm(formData);
      }
      
      if (result.success) {
        alert(result.message || '保存成功');
        document.getElementById('product-modal').style.display = 'none';
        this.loadProducts();
      } else {
        alert(result.error || '保存失败');
      }
    } catch (e) {
      alert('网络错误，请稍后重试');
    }
  }
  
  // ===== 订单管理 =====
  async loadOrders(status = 'all') {
    const tbody = document.getElementById('order-table-body');
    tbody.innerHTML = '<tr><td colspan="9" class="loading">加载中...</td></tr>';
    
    try {
      const orders = await API.getAdminOrders(status === 'all' ? null : status);
      if (orders && orders.length > 0) {
        tbody.innerHTML = orders.map(o => `
          <tr>
            <td>${o.order_number}</td>
            <td>${o.user_name || o.user_phone}</td>
            <td>${o.product_title || ''}</td>
            <td>${o.quantity}</td>
            <td>¥${(o.amount || 0).toFixed(2)}</td>
            <td>¥${(o.commission || 0).toFixed(2)}</td>
            <td><span class="status-badge ${o.status}">${this.getStatusText(o.status)}</span></td>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
            <td>
              <select class="form-select" data-order="${o.id}" style="font-size:12px;padding:4px 8px;width:auto;">
                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>待付款</option>
                <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>已付款</option>
                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>已发货</option>
                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>已完成</option>
                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>已取消</option>
              </select>
            </td>
          </tr>
        `).join('');
        
        // 绑定状态变更事件
        tbody.querySelectorAll('select[data-order]').forEach(sel => {
          sel.addEventListener('change', () => {
            this.updateOrderStatus(sel.dataset.order, sel.value);
          });
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--gray-400);padding:30px;">暂无订单</td></tr>';
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:red;">加载失败</td></tr>';
    }
  }
  
  async updateOrderStatus(orderId, status) {
    try {
      const result = await API.updateOrderStatus(orderId, status);
      if (result.success) {
        alert('订单状态已更新');
        this.loadOrders(document.getElementById('admin-order-filter').value);
      } else {
        alert(result.error || '更新失败');
      }
    } catch (e) {
      alert('网络错误，请稍后重试');
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
  
  // ===== 用户管理 =====
  async loadUsers() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">加载中...</td></tr>';
    
    try {
      const users = await API.getAdminUsers();
      if (users && users.length > 0) {
        tbody.innerHTML = users.map(u => `
          <tr>
            <td>${u.id}</td>
            <td>${u.phone}</td>
            <td>${u.nickname || '-'}</td>
            <td>${u.country || '-'}</td>
            <td>¥${(u.balance || 0).toFixed(2)}</td>
            <td>¥${(u.income || 0).toFixed(2)}</td>
            <td><span class="status-badge ${u.is_admin ? 'active' : ''}">${u.is_admin ? '管理员' : '用户'}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray-400);padding:30px;">暂无用户</td></tr>';
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">加载失败</td></tr>';
    }
  }
}

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});
