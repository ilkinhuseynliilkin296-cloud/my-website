'use client'
import Link from 'next/link'

export default function DashboardPage() {
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn') // 清除登录状态
    window.location.href = '/' // 跳回首页
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
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎉 欢迎回来！</h1>
        <p style={{ fontSize: '1rem', marginBottom: '2rem', opacity: 0.9 }}>您已成功登录全球商家商城平台</p>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.2)', 
          padding: '1.5rem', 
          borderRadius: '12px',
          width: '100%',
          maxWidth: '320px',
          textAlign: 'left',
          marginBottom: '1.5rem'
        }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 2, margin: 0 }}>
            ✅ 账号状态：正常<br />
            ✅ 登录时间：刚刚<br />
            ✅ 平台权限：已开通
          </p>
        </div>

        {/* 退出登录按钮 */}
        <button 
          onClick={handleLogout}
          style={{ 
            width: '100%', 
            maxWidth: '320px',
            padding: '0.85rem', 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            border: '1px solid rgba(255,255,255,0.3)', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          🚪 退出登录
        </button>

        <Link href="/" style={{ display: 'inline-block', color: 'white', textDecoration: 'underline' }}>← 返回首页</Link>
      </div>
    </main>
  )
}