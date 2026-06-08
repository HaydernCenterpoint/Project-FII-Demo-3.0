'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginAction } from './actions'
import { toast } from 'sonner'
import { 
  ArrowRight, Shield, Users, Activity, Zap, 
  LogIn 
} from 'lucide-react'

// FII Logo - SVG recreation sạch sẽ, chuyên nghiệp (dựa trên Foxconn Industrial Internet.png)
function FIILogo({ className = '' }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 280 72" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Foxconn Industrial Internet"
    >
      {/* Stylized "fii" mark */}
      <g>
        {/* Main blue shape - f */}
        <path 
          d="M18 12 L18 60 L30 60 L30 42 L48 42 L48 32 L30 32 L30 22 L52 22 L52 12 Z" 
          fill="#003087" 
        />
        {/* i vertical */}
        <rect x="58" y="12" width="12" height="48" rx="1.5" fill="#003087" />
        {/* Accent red on the right i / dot area */}
        <rect x="74" y="12" width="11" height="48" rx="1.5" fill="#003087" />
        <rect x="74" y="12" width="11" height="14" fill="#E30613" /> {/* Red accent top */}
        {/* Small connecting geometric accent */}
        <path d="M86 28 L94 36 L94 60 L86 52 Z" fill="#0055A4" />
      </g>

      {/* Text - Foxconn Industrial Internet */}
      <g fill="#003087" fontFamily="var(--font-geist-sans), system-ui, sans-serif">
        <text x="108" y="32" fontSize="21" fontWeight="700" letterSpacing="-0.3">Foxconn</text>
        <text x="108" y="54" fontSize="19.5" fontWeight="600" letterSpacing="-0.2">Industrial Internet</text>
      </g>
    </svg>
  )
}

// Small version for nav
function FIILogoSmall() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-lg bg-[#003087] flex items-center justify-center overflow-hidden">
        <span className="text-white font-bold text-[17px] tracking-[-1.5px] mt-px">fii</span>
        <div className="absolute top-1 right-1 w-2.5 h-1.5 bg-[#E30613]" />
      </div>
      <div>
        <div className="font-semibold tracking-tight text-[#003087] dark:text-white text-lg leading-none">FII</div>
        <div className="text-[9px] text-[#003087]/70 dark:text-white/60 -mt-0.5">LINEGUARD</div>
      </div>
    </div>
  )
}

const DEMO_ACCOUNTS = [
  { code: 'CQ001', pass: 'admin123', role: 'Chủ Quản', desc: 'Quyền cao nhất' },
  { code: 'TL002', pass: 'troly123', role: 'Trợ Lý', desc: 'Hỗ trợ vận hành' },
  { code: 'CT003', pass: 'chuyen123', role: 'Chuyền Trưởng', desc: 'Quản lý ca' },
  { code: 'KS004', pass: 'kysu123', role: 'Kỹ Sư', desc: 'Kỹ thuật + PLC' },
]

function LoginForm() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Hiển thị thông báo từ middleware (login_required, session_expired, v.v)
  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'login_required' || err === 'unauthorized') {
      setError('Vui lòng đăng nhập để tiếp tục')
    }
    if (err === 'session_expired') {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await loginAction(employeeCode, password)

      if (result.success) {
        toast.success(`Đăng nhập thành công. Xin chào ${result.user?.name}!`, {
          description: `Vai trò: ${result.user?.role}`,
        })
        // Chuyển đến Dashboard (sẽ phát triển ở giai đoạn tiếp theo)
        router.push('/dashboard')
      } else {
        setError(result.error || 'Đăng nhập thất bại')
        toast.error(result.error || 'Đăng nhập thất bại')
      }
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.')
      toast.error('Đã xảy ra lỗi hệ thống')
    } finally {
      setIsLoading(false)
    }
  }

  const quickLogin = (code: string, pass: string) => {
    setEmployeeCode(code)
    setPassword(pass)
    // Auto submit sau khi điền
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement
      form?.requestSubmit()
    }, 60)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0A0E17] overflow-hidden">
      {/* Top Navigation - Industrial minimal */}
      <nav className="border-b border-[#E2E8F0] dark:border-white/10 bg-white/80 dark:bg-[#0A0E17]/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FIILogoSmall />
            <div className="ml-1.5 pl-3 border-l border-[#E2E8F0] dark:border-white/15">
              <span className="text-sm font-medium tracking-[1.5px] text-[#003087] dark:text-white/90">LINEGUARD</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden md:flex items-center gap-2 text-[#64748B] dark:text-slate-400">
              <Shield className="w-4 h-4" />
              <span>Phân quyền RBAC</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-[#003087]/5 dark:bg-white/5 text-[#003087] dark:text-white text-xs font-medium tracking-widest">
              v1.0 • MKZ DEMO
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-12 gap-x-12 gap-y-14 items-center">
          {/* Left: Branding & Value Prop */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-4 h-8 rounded-full border border-[#003087]/15 bg-white dark:bg-white/5 text-[#003087] dark:text-white/90 text-sm mb-6">
              <div className="w-2 h-2 rounded-full bg-[#E30613] animate-pulse" />
              FOXCONN INDUSTRIAL INTERNET
            </div>

            <h1 className="text-5xl lg:text-[56px] leading-[1.05] font-semibold tracking-tighter text-[#0F172A] dark:text-white mb-5">
              FII LineGuard
            </h1>
            
            <p className="text-2xl lg:text-3xl font-medium tracking-tight text-[#003087] dark:text-[#60A5FA] mb-6">
              Hệ thống Quản lý &amp; Giám sát Dây chuyền Sản xuất Thông minh
            </p>

            <p className="max-w-[620px] text-xl text-[#475569] dark:text-slate-300 leading-relaxed mb-9">
              Giám sát thời gian thực • OEE • PLC Integration • Báo cáo tự động<br />
              Dành cho nhà máy thông minh Foxconn Industrial Internet
            </p>

            {/* Key value points */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[
                { icon: Activity, label: 'Sơ đồ dây chuyền tương tác' },
                { icon: Zap, label: 'Mô phỏng PLC & Realtime' },
                { icon: Users, label: 'Phân quyền 4 cấp độ' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-[#334155] dark:text-slate-300">
                  <item.icon className="w-4 h-4 text-[#003087] dark:text-[#60A5FA]" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Login Card */}
          <div className="lg:col-span-5">
            <div className="login-card rounded-2xl p-8 md:p-9 border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#003087] text-white">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xl tracking-tight">Đăng nhập hệ thống</div>
                  <div className="text-sm text-[#64748B] dark:text-slate-400">Sử dụng Mã nhân viên công ty</div>
                </div>
              </div>

              <form id="login-form" onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold tracking-widest text-[#64748B] dark:text-slate-400 mb-1.5">
                    MÃ NHÂN VIÊN
                  </label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    placeholder="CQ001"
                    className="w-full h-12 px-4 rounded-xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#111827] font-mono text-lg tracking-[3px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#003087] dark:focus:border-[#60A5FA] transition"
                    required
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-widest text-[#64748B] dark:text-slate-400 mb-1.5">
                    MẬT KHẨU
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 rounded-xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#111827] text-lg placeholder:text-[#94A3B8] focus:outline-none focus:border-[#003087] dark:focus:border-[#60A5FA] transition"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="text-sm text-[#E30613] bg-[#FEF2F2] dark:bg-[#3F1A1A] border border-[#FECACA] dark:border-red-900/50 px-4 py-2.5 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !employeeCode || !password}
                  className="btn-fii w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                >
                  {isLoading ? 'Đang xác thực...' : 'ĐĂNG NHẬP VÀO HỆ THỐNG'}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {/* Demo accounts */}
              <div className="mt-7 pt-6 border-t border-[#E2E8F0] dark:border-white/10">
                <div className="text-[10px] font-semibold tracking-[1px] text-[#64748B] dark:text-slate-400 mb-3">TÀI KHOẢN DEMO (CLICK ĐỂ ĐĂNG NHẬP NHANH)</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {DEMO_ACCOUNTS.map((acc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => quickLogin(acc.code, acc.pass)}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#003087]/40 dark:border-white/10 dark:hover:border-white/30 transition group"
                    >
                      <div className="font-mono text-[#003087] dark:text-[#60A5FA] font-semibold tracking-widest text-sm group-hover:underline">{acc.code}</div>
                      <div className="text-xs text-[#475569] dark:text-slate-400">{acc.role} • {acc.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-center text-[#94A3B8] dark:text-slate-500 mt-3">
                  Mật khẩu hiển thị chỉ dùng cho môi trường demo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reference diagram from original image */}
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-white/10" />
            <div className="uppercase text-xs tracking-[2px] text-[#64748B] dark:text-slate-400 font-medium">Tham khảo sơ đồ gốc</div>
            <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-white/10" />
          </div>

          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#111827] p-3 shadow-sm">
            <div className="relative">
              <img 
                src="/images/mkz-diagram.png" 
                alt="Sơ đồ mô phỏng dây chuyền tự động MCKENZIE AUTO LINE - 2 station đầu vào: Vỏ/Chassis và Bo mạch" 
                className="w-full max-h-[340px] object-contain rounded-lg bg-[#F8FAFC] dark:bg-[#0A0E17]"
              />
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-3 py-1 rounded font-mono tracking-widest">
                MCKENZIE AUTO LINE — 2 FEEDING STATIONS
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-[#64748B] dark:text-slate-500 mt-3">
            Sơ đồ ban đầu từ tài liệu nội bộ Foxconn Industrial Internet • Sẽ được tái tạo đầy đủ 7-8 trạm trong React Flow
          </p>
        </div>

        {/* Bottom branding bar */}
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-y-4 text-sm text-[#64748B] dark:text-slate-400 border-t border-[#E2E8F0] dark:border-white/10 pt-8">
          <div>
            © Foxconn Industrial Internet • Hệ thống MES nội bộ • Dành cho nhân viên được cấp quyền
          </div>
          <div className="flex items-center gap-5 text-xs">
            <span>SQLite • Next.js 15 • React Flow</span>
            <span className="hidden md:inline">•</span>
            <span>Simulation Mode sẵn sàng</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap useSearchParams in Suspense boundary (Next.js requirement for static rendering)
export default function FIILineGuardLanding() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0A0E17] flex items-center justify-center">
        <div className="text-[#003087] dark:text-white text-sm tracking-widest">ĐANG TẢI FII LINEGUARD...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
