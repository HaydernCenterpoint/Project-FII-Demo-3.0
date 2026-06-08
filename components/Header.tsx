'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore, loadCurrentUser } from '@/lib/authStore'
import { useSimulationStore } from '@/lib/simulationStore'
import { LogOut, Search, User } from 'lucide-react'
import { logoutAction } from '@/app/actions'
import { Command } from 'cmdk'

export default function Header({ title = 'FII LineGuard' }: { title?: string }) {
  const { user, setUser } = useAuthStore()
  const { isSimulating } = useSimulationStore()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  useEffect(() => {
    // Load current user on mount for RBAC
    loadCurrentUser().then((u) => {
      if (u) setUser(u)
    })
  }, [setUser])

  const roleLabel: Record<string, string> = {
    CHU_QUAN: 'Chủ Quản',
    TRO_LY: 'Trợ Lý',
    CHUYEN_TRUONG: 'Chuyền Trưởng',
    KY_SU: 'Kỹ Sư',
  }

  // Simple global search (machines + quick links)
  const searchResults = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sơ đồ MKZ', href: '/line/mkz' },
    { label: 'Báo cáo & Thống kê', href: '/reports' },
    { label: 'Máy MKZ-01 (Cấp phôi Vỏ)', href: '/line/mkz?highlight=MKZ-01' },
    { label: 'Máy MKZ-04 (Hàn tự động)', href: '/line/mkz?highlight=MKZ-04' },
    { label: 'Cài đặt dây chuyền', href: '/line/mkz?tab=settings' },
  ].filter(r => 
    r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.href.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="border-b border-[#E2E8F0] dark:border-white/10 bg-white/95 dark:bg-[#0A0E17]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#003087] flex items-center justify-center">
              <span className="text-white text-sm font-bold tracking-[-1px]">fii</span>
            </div>
            <div className="font-semibold tracking-tight text-xl text-[#003087] dark:text-white">{title}</div>
          </Link>

          {isSimulating && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-medium">
              ● SIMULATION ĐANG CHẠY
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search */}
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 h-8 text-sm rounded-lg border hover:bg-[#F8F9FC] dark:hover:bg-white/5 text-[#64748B]"
          >
            <Search className="w-4 h-4" /> Tìm kiếm toàn cục (⌘K)
          </button>

          {/* User info + role */}
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <div className="hidden md:block text-right">
                <div className="font-medium">{user.name}</div>
                <div className="text-[10px] text-[#64748B] -mt-0.5">{roleLabel[user.role]}</div>
              </div>
              <div className="p-1.5 rounded-full bg-[#003087]/10 dark:bg-white/10">
                <User className="w-4 h-4 text-[#003087] dark:text-white" />
              </div>
            </div>
          )}

          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-1.5 px-3 h-8 text-sm rounded-lg border hover:bg-red-50 dark:hover:bg-red-950/30 text-[#64748B] hover:text-red-600">
              <LogOut className="w-4 h-4" /> Thoát
            </button>
          </form>
        </div>
      </div>

      {/* Command Palette / Global Search */}
      {searchOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 bg-black/40" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-white dark:bg-[#0A0E17] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <Command className="border-0" shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 text-[#64748B]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm máy, trang, hướng dẫn..."
                  className="flex h-12 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-[#94A3B8]"
                  autoFocus
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                {searchResults.length === 0 && <div className="p-3 text-sm text-[#64748B]">Không tìm thấy kết quả.</div>}
                {searchResults.map((r, i) => (
                  <Command.Item 
                    key={i}
                    onSelect={() => {
                      setSearchOpen(false)
                      window.location.href = r.href
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-[#F8F9FC] dark:hover:bg-white/5"
                  >
                    <span>{r.label}</span>
                  </Command.Item>
                ))}
              </Command.List>
              <div className="border-t px-3 py-2 text-[10px] text-[#94A3B8]">⌘K để mở • Esc để đóng</div>
            </Command>
          </div>
        </div>
      )}
    </div>
  )
}
