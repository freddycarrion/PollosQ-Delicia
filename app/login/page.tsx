'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    if (data.user) {
      // Obtener rol para redirigir correctamente
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', data.user.id)
        .single()

      const rolesOperativos = ['mesero', 'cocinero', 'repartidor', 'limpieza']

      if (perfil?.rol === 'cajero') {
        router.push('/pos')
      } else if (rolesOperativos.includes(perfil?.rol || '')) {
        router.push('/portal')
      } else {
        router.push('/admin/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      {/* Fondo animado */}
      <div className="login-bg">
        <div className="login-bg-circle c1" />
        <div className="login-bg-circle c2" />
        <div className="login-bg-circle c3" />
      </div>

      {/* Card de login */}
      <div className="login-card animate-fade-in-scale">

        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="login-logo-glow" />
          <Image
            src="/logo.png"
            alt="Pollos Q' Delicia"
            width={130}
            height={130}
            priority
            className="login-logo"
          />
        </div>

        <div className="login-titles">
          <h1 className="login-title">Pollos Q' <span>Delicia</span></h1>
          <p className="login-subtitle">Sistema de Gestión Interno</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="login-form">

          {/* Error */}
          {error && (
            <div className="login-error animate-fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="input-group">
            <label className="input-label" htmlFor="email">Correo electrónico</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ejemplo@tiasarita.com"
                required
                autoComplete="email"
                className="input-field has-icon"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="input-group">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="icon" />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="input-field has-icon"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="login-toggle-pass"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botón */}
          <button
            id="btn-login"
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg w-full login-btn"
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Ingresando...
              </>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        <p className="login-footer">
          🍗 El sabor que conquista
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-900);
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        /* Círculos de fondo animados */
        .login-bg { position: absolute; inset: 0; pointer-events: none; }
        .login-bg-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
        }
        .c1 {
          width: 500px; height: 500px;
          background: var(--red);
          top: -150px; left: -150px;
          animation: floatA 8s ease-in-out infinite;
        }
        .c2 {
          width: 400px; height: 400px;
          background: var(--yellow);
          bottom: -100px; right: -100px;
          animation: floatB 10s ease-in-out infinite;
        }
        .c3 {
          width: 300px; height: 300px;
          background: var(--orange);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: floatC 12s ease-in-out infinite;
        }
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(30px, 20px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(-20px, -30px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%       { transform: translate(-50%, -50%) scale(1.15); }
        }

        /* Card */
        .login-card {
          background: var(--bg-700);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 40px 36px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
          position: relative;
          z-index: 1;
          backdrop-filter: blur(10px);
        }

        /* Logo */
        .login-logo-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .login-logo-glow {
          position: absolute;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(253,216,53,0.25) 0%, transparent 70%);
          border-radius: 50%;
          top: -15px;
        }
        .login-logo {
          border-radius: 50%;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 20px rgba(211,47,47,0.4));
          transition: var(--transition-slow);
        }
        .login-logo:hover { transform: scale(1.04) rotate(2deg); }

        /* Títulos */
        .login-titles { text-align: center; margin-bottom: 28px; }
        .login-title {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--text-100);
          line-height: 1;
        }
        .login-title span { color: var(--red); }
        .login-subtitle {
          font-size: 0.85rem;
          color: var(--text-500);
          margin-top: 6px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Formulario */
        .login-form { display: flex; flex-direction: column; gap: 16px; }

        /* Error */
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(211,47,47,0.12);
          border: 1px solid rgba(211,47,47,0.3);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--red-light);
        }

        /* Toggle contraseña */
        .login-toggle-pass {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-500);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: var(--transition);
        }
        .login-toggle-pass:hover { color: var(--text-200); }

        /* Botón login */
        .login-btn { margin-top: 4px; font-size: 1rem; font-weight: 700; }

        /* Spinner */
        .login-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer */
        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 0.8rem;
          color: var(--text-600);
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  )
}
