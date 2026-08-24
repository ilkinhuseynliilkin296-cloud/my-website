// 国际化支持
const i18n = {
  currentLang: 'zh',
  translations: {},
  
  // 加载语言文件
  async loadTranslations(lang) {
    try {
      const response = await fetch(`locales/${lang}.json`);
      if (!response.ok) throw new Error('加载语言文件失败');
      this.translations = await response.json();
      this.currentLang = lang;
      this.applyTranslations();
      return true;
    } catch (error) {
      console.error('加载语言文件失败:', error);
      // 如果加载失败，尝试加载中文
      if (lang !== 'zh') {
        return this.loadTranslations('zh');
      }
      return false;
    }
  },
  
  // 获取翻译文本
  t(key) {
    const keys = key.split('.');
    let value = this.translations;
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key;
      }
    }
    return value || key;
  },
  
  // 应用翻译到页面
  applyTranslations() {
    // 翻译所有带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation !== key) {
        // 如果是 input/textarea 的 placeholder
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.getAttribute('data-i18n-placeholder') !== null) {
            el.placeholder = translation;
          } else if (el.value === '' || el.getAttribute('data-i18n-value') !== null) {
            el.value = translation;
          } else {
            el.textContent = translation;
          }
        } else {
          el.textContent = translation;
        }
      }
    });
    
    // 更新页面标题
    document.title = this.t('appName') || 'Global Mall';
    
    // 触发自定义事件
    document.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { lang: this.currentLang } 
    }));
  },
  
  // 切换语言
  async switchLanguage(lang) {
    if (lang === this.currentLang) return;
    const success = await this.loadTranslations(lang);
    if (success) {
      localStorage.setItem('preferredLanguage', lang);
    }
    return success;
  },
  
  // 初始化
  async init() {
    // 从localStorage或浏览器语言获取首选语言
    const savedLang = localStorage.getItem('preferredLanguage');
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['zh', 'ru', 'ky', 'uz', 'en'];
    
    let defaultLang = 'zh';
    if (savedLang && supportedLangs.includes(savedLang)) {
      defaultLang = savedLang;
    } else if (supportedLangs.includes(browserLang)) {
      defaultLang = browserLang;
    }
    
    await this.loadTranslations(defaultLang);
    return this;
  }
};

// 简写函数
function t(key) {
  return i18n.t(key);
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18n, t };
}
