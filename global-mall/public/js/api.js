// API 服务
const API = {
  baseURL: window.location.origin,
  token: localStorage.getItem('authToken') || null,
  
  // 设置认证token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  },
  
  // 获取请求头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  },
  
  // 通用请求方法
  async request(url, options = {}) {
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };
    
    // 如果是 FormData，移除 Content-Type 让浏览器自动设置
    if (config.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    try {
      const response = await fetch(`${this.baseURL}${url}`, config);
      const data = await response.json();
      
      // 如果返回401，清除token
      if (response.status === 401) {
        this.setToken(null);
        if (window.location.pathname !== '/') {
          // 触发登录跳转
          document.dispatchEvent(new CustomEvent('authExpired'));
        }
      }
      
      return data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  },
  
  // GET 请求
  get(url) {
    return this.request(url, { method: 'GET' });
  },
  
  // POST 请求
  post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // PUT 请求
  put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // DELETE 请求
  delete(url) {
    return this.request(url, { method: 'DELETE' });
  },
  
  // 带文件上传的 POST
  postForm(url, formData) {
    return this.request(url, {
      method: 'POST',
      body: formData
    });
  },
  
  // 带文件上传的 PUT
  putForm(url, formData) {
    return this.request(url, {
      method: 'PUT',
      body: formData
    });
  },
  
  // ===== 用户相关 =====
  async login(phone, password) {
    const result = await this.post('/api/login', { phone, password });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  },
  
  async register(phone, password, nickname, country) {
    return this.post('/api/register', { phone, password, nickname, country });
  },
  
  async getUser() {
    return this.get('/api/user');
  },
  
  // ===== 商品相关 =====
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/products?${query}`);
  },
  
  async getProduct(id) {
    return this.get(`/api/product/${id}`);
  },
  
  // ===== 订单相关 =====
  async createOrder(productId, quantity, address) {
    return this.post('/api/order', { product_id: productId, quantity, address });
  },
  
  async getOrders(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.get(`/api/orders${query}`);
  },
  
  async updateOrderStatus(orderId, status) {
    return this.put(`/api/order/${orderId}/status`, { status });
  },
  
  // ===== 后台相关 =====
  async getDashboard() {
    return this.get('/api/dashboard');
  },
  
  async getAdminProducts() {
    return this.get('/api/admin/products');
  },
  
  async createAdminProduct(data) {
    return this.post('/api/admin/products', data);
  },
  
  async createAdminProductForm(formData) {
    return this.postForm('/api/admin/products', formData);
  },
  
  async updateAdminProduct(id, data) {
    return this.put(`/api/admin/products/${id}`, data);
  },
  
  async updateAdminProductForm(id, formData) {
    return this.putForm(`/api/admin/products/${id}`, formData);
  },
  
  async deleteAdminProduct(id) {
    return this.delete(`/api/admin/products/${id}`);
  },
  
  async getAdminUsers() {
    return this.get('/api/admin/users');
  },
  
  async getAdminOrders(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.get(`/api/admin/orders${query}`);
  }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
