'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ account: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [msg, setMsg] = useState('')

  const handleRegister = () => {
    if (!form.account || !form.password || !form.confirm) {
      setMsg('⚠️ 所有项都要填写！')
      return
    }
    if (form.password !== form.confirm) {
      setMsg('⚠️ 两次密码不一致！')
      return
    }
    // ✅ 注册时保存账号密码 → 登录页直接读取
    localStorage.setItem('regAccount', form.account)
    localStorage.setItem('regPassword', form.password)
    setMsg('✅ 注册成功！正在跳转到登录页...')
    setTimeout(() => {
      window.location.href = '/login'
    }, 2000)
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
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>📝 用户注册</h1>
      
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
            placeholder="请设置账号"
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

        {/* 设置密码 - 带小眼睛 */}
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>设置密码</label>
          <input 
            type={showPwd ? 'text' : 'password'} 
            placeholder="请设置密码"
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

        {/* 确认密码 - 带小眼睛 */}
        <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>确认密码</label>
          <input 
            type={showConfirm ? 'text' : 'password'} 
            placeholder="请再输入密码"
            value={form.confirm}
            onChange={(e) => setForm({...form, confirm: e.target.value})}
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
            onClick={() => setShowConfirm(!showConfirm)}
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
            {showConfirm ? '🙈' : '👁️'}
          </button>
        </div>

        <button 
          onClick={handleRegister}
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
          立即注册
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