'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [form, setForm] = useState({ account: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [msg, setMsg] = useState('')

  // ✅ 页面打开时自动读取刚才注册的账号密码
  useEffect(() => {
    const acc = localStorage.getItem('regAccount') || ''
    const pwd = localStorage.getItem('regPassword') || ''
    if (acc) {
      setForm({ account: acc, password: pwd })
    }
  }, [])

  const handleLogin = () => {
    if (!form.account || !form.password) {
      setMsg('⚠️ 请填写账号和密码！')
      return
    }
    // ✅ 验证是否和注册时的一致
    const regAcc = localStorage.getItem('regAccount')
    const regPwd = localStorage.getItem('regPassword')
    if (form.account === regAcc && form.password === regPwd) {
      setMsg('✅ 登录成功！正在进入...')
      setTimeout(() => {
        localStorage.setItem('isLoggedIn', 'true')
        window.location.href = '/'
      }, 1500)
    } else {
      setMsg('⚠️ 账号或密码不正确！')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '1.5rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>🔐 用户登录</h1>
      
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '12px', 
        color: '#333', 
        width: '100%', 
        maxWidth: '360px' 
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>账号</label>
          <input 
            type="text" 
            placeholder="请输入账号"
            value={form.account}
            onChange={(e) => setForm({...form, account: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '0.85rem', 
              borderRadius: '8px', 
              border: '1px solid #ccc', 
              fontSize: '1rem',
              boxSizing: 'border-box'
            }} 
          />
        </div>

        {/* 密码 - 带小眼睛 */}
        <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>密码</label>
          <input 
            type={showPwd ? 'text' : 'password'} 
            placeholder="请输入密码"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '0.85rem 2.5rem 0.85rem 0.85rem', 
              borderRadius: '8px', 
              border: '1px solid #ccc', 
              fontSize: '1rem',
              boxSizing: 'border-box'
            }} 
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '2.1rem',
              fontSize: '1.1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>

        <button 
          onClick={handleLogin}
          style={{ 
            width: '100%', 
            padding: '0.9rem', 
            background: 'linear-gradient(90deg, #667eea, #764ba2)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          立即登录
        </button>
        
        {msg && (
          <p style={{ marginTop: '1rem', textAlign: 'center', fontWeight: 500 }}>
            {msg}
          </p>
        )}
      </div>
      
      <Link href="/" style={{ marginTop: '2rem', color: 'white', textDecoration: 'underline' }}>← 返回首页</Link>
    </main>
  )
}