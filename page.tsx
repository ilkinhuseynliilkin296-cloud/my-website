'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const logged = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(logged)
  }, [])

  const stats = { today: 0, total: 0, orders: 0 }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        padding: '0 1rem 2.5rem',
      }}
    >
      {/* 顶部导航 */}
      <header style={{ 
        padding: '1.25rem 0.25rem 1rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '600', margin: 0 }}>🌐 全球商家商城</h2>
        <div>
          {isLoggedIn ? (
            <Link href="/dashboard">
              <button style={{ 
                padding: '0.45rem 1.1rem', 
                borderRadius: '20px', 
                border: 'none', 
                background: 'white', 
                color: '#667eea', 
                fontWeight: '600', 
                fontSize: '0.9rem', 
                cursor: 'pointer' 
              }}>
                🧑 我的中心
              </button>
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href="/login">
                <button style={{ 
                  padding: '0.45rem 1rem', 
                  borderRadius: '20px', 
                  border: 'none', 
                  background: 'white', 
                  color: '#667eea', 
                  fontWeight: '600', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer' 
                }}>
                  🔐 登录
                </button>
              </Link>
              <Link href="/register">
                <button style={{ 
                  padding: '0.45rem 1rem', 
                  borderRadius: '20px', 
                  border: '1.5px solid white', 
                  background: 'transparent', 
                  color: 'white', 
                  fontWeight: '600', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer' 
                }}>
                  📝 注册
                </button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* 标题区 */}
      <section style={{ padding: '0.5rem 0 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: '700' }}>欢迎来到全球商家商城</h1>
        <p style={{ fontSize: '0.95rem', opacity: 0.85, margin: 0 }}>安全 · 高效 · 共赢</p>
      </section>

      {/* 数据卡片 */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.18)', 
          padding: '1.25rem 1rem', 
          borderRadius: '16px', 
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.35rem' }}>💰 今日收益</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700' }}>¥ {stats.today.toFixed(2)}</div>
        </div>
        <div style={{ 
          background: 'rgba(255,255,255,0.18)', 
          padding: '1.25rem 1rem', 
          borderRadius: '16px', 
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.35rem' }}>📊 累计佣金</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700' }}>¥ {stats.total.toLocaleString()}</div>
        </div>
        <div style={{ 
          background: 'rgba(255,255,255,0.18)', 
          padding: '1.25rem 1rem', 
          borderRadius: '16px', 
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.35rem' }}>📦 今日订单</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700' }}>{stats.orders} 单</div>
        </div>
      </section>

      {/* 注册按钮 */}
      {!isLoggedIn && (
        <div style={{ marginBottom: '2.5rem' }}>
          <Link href="/register">
            <button style={{ 
              width: '100%', 
              padding: '1rem', 
              fontSize: '1rem', 
              borderRadius: '14px', 
              border: 'none', 
              background: 'white', 
              color: '#667eea', 
              fontWeight: '700', 
              cursor: 'pointer' 
            }}>
              🚀 立即加入，开始赚钱
            </button>
          </Link>
        </div>
      )}

      {/* 核心功能 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: '600' }}>✨ 核心功能</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
          {[
            { icon: '🛍️', title: '商品浏览' },
            { icon: '⚡', title: '一键接单' },
            { icon: '💵', title: '实时佣金' },
            { icon: '📈', title: '每日收益' },
            { icon: '🌍', title: '全球支持' },
            { icon: '🔤', title: '多语言' },
          ].map((item, i) => (
            <div key={i} style={{ 
              background: 'rgba(255,255,255,0.15)', 
              padding: '1.25rem 0.75rem', 
              borderRadius: '14px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.95rem' }}>{item.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 平台优势 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: '600' }}>🏆 平台优势</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
          {[
            { icon: '🌐', text: '覆盖 200+ 国家' },
            { icon: '🤝', text: '全球商家合作' },
            { icon: '🔒', text: '安全资金系统' },
            { icon: '💬', text: '24 小时客服' },
            { icon: '🏦', text: '快速提现' },
            { icon: '🎯', text: '智能匹配订单' },
          ].map((item, i) => (
            <div key={i} style={{ 
              background: 'rgba(255,255,255,0.12)', 
              padding: '1rem 0.6rem', 
              borderRadius: '12px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 联系我们 */}
      <section style={{ 
        background: 'rgba(0,0,0,0.08)', 
        padding: '1.5rem 1rem', 
        borderRadius: '16px' 
      }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', textAlign: 'center', fontWeight: '600' }}>📞 联系我们</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
          <div>✈️ Telegram: @GlobalMall</div>
          <div>💬 WhatsApp: +888 88888888</div>
          <div>📧 邮箱: support@globalmall.com</div>
        </div>
      </section>

      {/* 底部 */}
      <footer style={{ padding: '1.5rem 0 1rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.65 }}>
        © 2026 全球商家商城平台 · 安全 · 高效 · 共赢
      </footer>
    </main>
  )
}