'use client'

import React, { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getDashboardData } from '@/app/actions'
import { useSimulationStore, startGlobalSimulation, stopGlobalSimulation, type SimMachine, type SimAlert } from '@/lib/simulationStore'
import { 
  Activity, ArrowRight, Play, Pause, RefreshCw, AlertTriangle, 
  TrendingUp, Users, Zap, LogOut 
} from 'lucide-react'
import { toast } from 'sonner'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

// Status badge with pulse
function StatusBadge({ status }: { status: SimMachine['status'] }) {
  const styles: Record<string, string> = {
    RUNNING: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    IDLE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    ERROR: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    MAINTENANCE: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    OFFLINE: 'bg-slate-400/10 text-slate-500 border-slate-400/30',
  }
  const dot = {
    RUNNING: 'status-running',
    ERROR: 'status-error',
    IDLE: 'bg-amber-500',
    MAINTENANCE: 'bg-orange-500',
    OFFLINE: 'bg-slate-400',
  }[status]

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
      <div className={`status-dot ${dot}`} />
      {status}
    </div>
  )
}

function MachineCard({ machine, onClick }: { machine: SimMachine; onClick: () => void }) {
  const isBad = machine.status === 'ERROR' || machine.status === 'MAINTENANCE'

  return (
    <div 
      onClick={onClick}
      className="card p-4 hover:border-[#003087]/40 dark:hover:border-[#60A5FA]/40 cursor-pointer group transition-all active:scale-[0.985]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-xs text-[#64748B] tracking-[1px]">{machine.code}</div>
          <div className="font-semibold text-[15px] leading-tight mt-0.5 pr-2 group-hover:text-[#003087] dark:group-hover:text-[#60A5FA] transition">{machine.name}</div>
        </div>
        <StatusBadge status={machine.status} />
      </div>

      <div className="flex items-center gap-2 text-[10px] mb-3">
        <span className="px-2 py-px rounded bg-[#003087]/5 dark:bg-white/5 text-[#003087] dark:text-white/80 font-medium">{machine.category}</span>
        {machine.plcConnected ? (
          <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">PLC OK</span>
        ) : (
          <span className="text-red-500">PLC LOST</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-[#64748B] tracking-widest">OEE</div>
          <div className="text-2xl font-semibold tabular-nums tracking-tighter mt-px">{machine.oee.toFixed(1)}<span className="text-sm font-normal">%</span></div>
        </div>
        <div>
          <div className="text-[10px] text-[#64748B] tracking-widest">THROUGHPUT</div>
          <div className="text-2xl font-semibold tabular-nums tracking-tighter mt-px">{machine.throughput}</div>
          <div className="text-[10px] -mt-1 text-[#64748B]">/giờ</div>
        </div>
        <div>
          <div className="text-[10px] text-[#64748B] tracking-widest">ĐÃ SX</div>
          <div className="text-xl font-semibold tabular-nums tracking-tighter mt-0.5">{(machine.totalProduced / 1000).toFixed(1)}k</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-white/10 text-[10px] text-[#64748B] flex justify-between">
        <span>Cycle: {machine.cycleTime}s</span>
        <span className={isBad ? 'text-red-500' : ''}>Lỗi: {machine.errorCount}</span>
      </div>
    </div>
  )
}

function AlertRow({ alert, onResolve }: { alert: SimAlert; onResolve: (id: string) => void }) {
  const sevColor = {
    CRITICAL: 'text-red-600 dark:text-red-400',
    ERROR: 'text-orange-600 dark:text-orange-400',
    WARNING: 'text-amber-600 dark:text-amber-400',
    INFO: 'text-sky-600 dark:text-sky-400',
  }[alert.severity]

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${alert.resolved ? 'opacity-50 bg-white/60 dark:bg-white/5' : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-white/10'}`}>
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500' : alert.severity === 'ERROR' ? 'bg-orange-500' : 'bg-amber-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[#003087] dark:text-[#60A5FA]">{alert.machineCode || 'GEN'}</span>
          <span className={`font-medium uppercase tracking-widest text-[10px] ${sevColor}`}>{alert.severity}</span>
        </div>
        <div className="text-sm leading-snug mt-0.5 pr-2">{alert.message}</div>
        <div className="text-[10px] text-[#94A3B8] mt-1">{alert.timestamp.toLocaleTimeString('vi-VN')}</div>
      </div>
      {!alert.resolved && (
        <button 
          onClick={() => onResolve(alert.id)}
          className="text-xs px-3 py-1 rounded-md border hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 self-start mt-1"
        >
          Xử lý
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const store = useSimulationStore()
  const [isLoading, setIsLoading] = React.useState(true)
  const [lastSync, setLastSync] = React.useState<Date>(new Date())

  // Load initial data once
  useEffect(() => {
    async function load() {
      try {
        const data = await getDashboardData()
        
        // Convert to SimMachine shape
        const simMachines = data.machines.map(m => ({
          ...m,
          lastUpdate: new Date(m.lastUpdate),
        }))

        store.initialize({
          machines: simMachines,
          alerts: data.unresolvedAlerts.map(a => ({ ...a, timestamp: new Date(a.timestamp) })),
          shiftTarget: data.shiftTarget,
          shiftActual: data.shiftActual,
        })

        setLastSync(new Date())
      } catch (e) {
        console.error(e)
        toast.error('Không thể tải dữ liệu dashboard. Dùng dữ liệu mẫu.')
        // Fallback seed data if DB fails
        store.initialize({
          machines: [
            { id:'1', code:'MKZ-01', name:'Cấp phôi Vỏ / Chassis', category:'FEEDING', status:'RUNNING', oee:94.2, throughput:1850, totalProduced:12480, cycleTime:2.8, errorCount:2, plcConnected:true, lastUpdate:new Date() },
            { id:'2', code:'MKZ-02', name:'Cấp Bo mạch (PCB)', category:'FEEDING', status:'RUNNING', oee:91.8, throughput:1830, totalProduced:12390, cycleTime:2.9, errorCount:4, plcConnected:true, lastUpdate:new Date() },
            { id:'3', code:'MKZ-03', name:'Lắp ráp & Căn chỉnh chính', category:'ASSEMBLY', status:'RUNNING', oee:88.5, throughput:1790, totalProduced:12150, cycleTime:3.4, errorCount:7, plcConnected:true, lastUpdate:new Date() },
            { id:'4', code:'MKZ-04', name:'Gắn linh kiện & Hàn tự động', category:'ASSEMBLY', status:'ERROR', oee:62.3, throughput:920, totalProduced:11870, cycleTime:4.1, errorCount:19, plcConnected:false, lastUpdate:new Date() },
            { id:'5', code:'MKZ-05', name:'Kiểm tra chức năng (FCT)', category:'TESTING', status:'RUNNING', oee:96.1, throughput:1720, totalProduced:11980, cycleTime:5.2, errorCount:3, plcConnected:true, lastUpdate:new Date() },
            { id:'6', code:'MKZ-06', name:'Kiểm tra thị giác (AOI/QC)', category:'QC', status:'RUNNING', oee:93.7, throughput:1680, totalProduced:11720, cycleTime:3.8, errorCount:5, plcConnected:true, lastUpdate:new Date() },
            { id:'7', code:'MKZ-07', name:'Dán nhãn & Đóng gói', category:'PACKAGING', status:'IDLE', oee:79.4, throughput:1450, totalProduced:10950, cycleTime:4.5, errorCount:8, plcConnected:true, lastUpdate:new Date() },
            { id:'8', code:'MKZ-08', name:'Palletizing & Outfeed', category:'OUTFEED', status:'MAINTENANCE', oee:0, throughput:0, totalProduced:10230, cycleTime:6.0, errorCount:11, plcConnected:false, lastUpdate:new Date() },
          ],
          alerts: [
            { id:'a1', machineCode:'MKZ-04', machineName:'Gắn linh kiện & Hàn tự động', severity:'ERROR', message:'MKZ-04: Mất tín hiệu encoder trục X - Dây chuyền dừng khẩn', timestamp:new Date(Date.now()-37*60000), resolved:false },
            { id:'a2', machineCode:'MKZ-08', machineName:'Palletizing & Outfeed', severity:'WARNING', message:'MKZ-08: Lịch bảo trì định kỳ - Thay băng tải & kiểm tra robot', timestamp:new Date(Date.now()-5*3600000), resolved:false },
          ],
          shiftTarget: 4200,
          shiftActual: 3850,
        })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Start global simulation loop
  useEffect(() => {
    startGlobalSimulation()
    return () => {
      stopGlobalSimulation()
    }
  }, [])

  const { 
    machines, alerts, isSimulating, overallOEE, totalProducedToday, 
    runningCount, errorCount, maintenanceCount, productionHistory,
    shiftTarget, shiftActual 
  } = store

  const progress = Math.min(99, Math.round((shiftActual / shiftTarget) * 100))

  // Live KPI values
  const kpis = useMemo(() => [
    { label: 'OEE Tổng thể', value: `${overallOEE.toFixed(1)}%`, change: '+1.8%' },
    { label: 'Sản lượng hôm nay', value: totalProducedToday.toLocaleString('vi-VN'), change: 'MKZ' },
    { label: 'Máy đang chạy', value: `${runningCount}/${machines.length}`, change: `${errorCount} lỗi` },
    { label: 'Cảnh báo active', value: alerts.filter(a => !a.resolved).length.toString(), change: '' },
  ], [overallOEE, totalProducedToday, runningCount, machines.length, errorCount, alerts])

  const handleResolve = (id: string) => {
    store.resolveAlert(id)
    toast.success('Đã xử lý cảnh báo', { description: 'Sự kiện đã được ghi vào Audit Log' })
  }

  const handleMachineClick = (code: string) => {
    // Phase 3 sẽ làm chi tiết máy + React Flow
    window.location.href = `/line/mkz?highlight=${code}`
  }

  const toggleSimulation = () => {
    if (isSimulating) {
      store.stopSimulation()
      toast.info('Simulation tạm dừng')
    } else {
      store.startSimulation()
      toast.success('Simulation tiếp tục')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] dark:bg-[#0A0E17]">
        <div className="text-center">
          <div className="animate-pulse text-[#003087] text-xl font-semibold tracking-widest">FII LINEGUARD</div>
          <div className="text-sm text-[#64748B] mt-2">Đang tải dữ liệu dây chuyền MKZ...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0A0E17]">
      {/* Global Header (from layout) + extra simulation controls */}
      <div className="max-w-7xl mx-auto px-8 pt-3 flex justify-end gap-2">
        <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] dark:border-white/15 px-1 py-1 bg-white dark:bg-[#111827]">
          <button 
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-4 h-8 rounded-full text-sm font-medium transition ${isSimulating ? 'bg-emerald-600 text-white' : 'hover:bg-[#F1F5F9] dark:hover:bg-white/5'}`}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isSimulating ? 'TẠM DỪNG SIM' : 'BẮT ĐẦU SIMULATION'}
          </button>
        </div>
        <Link href="/line/mkz" className="btn-fii flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-semibold">
          XEM SƠ ĐỒ DÂY CHUYỀN <ArrowRight className="w-4 h-4" />
        </Link>
        <button 
          onClick={() => {
            const steps = [
              "1. Bật/tắt Simulation ở góc trên để xem dữ liệu realtime.",
              "2. Click vào thẻ máy bất kỳ để xem chi tiết.",
              "3. Vào Sơ đồ dây chuyền để kéo thả và tương tác React Flow.",
              "4. Dùng Global Search (nút kính lúp) để tìm nhanh.",
              "5. Xem Báo cáo để xuất Excel/PDF đầy đủ."
            ]
            steps.forEach((s, i) => setTimeout(() => alert(s), i * 420))
          }}
          className="text-xs px-3 h-9 border rounded-lg hover:bg-white dark:hover:bg-[#111827]"
        >
          Hướng dẫn nhanh (Tour)
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="uppercase text-xs tracking-[2.5px] text-[#003087] dark:text-[#60A5FA] font-semibold">CONTROL ROOM • CA 1</div>
            <h1 className="text-4xl font-semibold tracking-tighter mt-1">Dashboard Tổng quan — MKZ</h1>
            <p className="text-[#475569] dark:text-slate-300 mt-1">Dây chuyền tự động MCKENZIE • Dữ liệu mô phỏng thời gian thực</p>
          </div>
          <div className="text-right text-sm hidden lg:block">
            <div className="text-[#64748B]">Cập nhật lần cuối</div>
            <div className="font-mono text-[#003087] dark:text-[#60A5FA]">{lastSync.toLocaleTimeString('vi-VN')}</div>
          </div>
        </div>

        {/* KPI Row - Live */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="card p-5">
              <div className="text-xs tracking-[1.5px] text-[#64748B] dark:text-slate-400 mb-1">{kpi.label}</div>
              <div className="text-4xl font-semibold tabular-nums tracking-[-1.5px]">{kpi.value}</div>
              {kpi.change && <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{kpi.change}</div>}
            </div>
          ))}
        </div>

        {/* Shift progress + Simulation status */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="card p-5 flex-1">
            <div className="flex justify-between text-sm mb-3">
              <div className="font-medium">Tiến độ Ca 1 • Mục tiêu {shiftTarget.toLocaleString()} units</div>
              <div className="font-mono text-[#003087] dark:text-[#60A5FA]">{progress}%</div>
            </div>
            <div className="h-2.5 bg-[#E2E8F0] dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#003087] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[#64748B] mt-1.5">
              <div>Đã sản xuất: <span className="font-medium text-[#0F172A] dark:text-white">{shiftActual.toLocaleString()}</span></div>
              <div>Còn lại: {Math.max(0, shiftTarget - shiftActual).toLocaleString()}</div>
            </div>
          </div>

          <div className={`card p-5 w-full lg:w-80 flex items-center gap-4 ${isSimulating ? 'border-emerald-500/30' : ''}`}>
            <div className={`p-3 rounded-xl ${isSimulating ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Simulation Mode</div>
              <div className="text-sm text-[#64748B]">{isSimulating ? 'Đang chạy • Dữ liệu thay đổi tự động' : 'Tạm dừng'}</div>
            </div>
            <button onClick={toggleSimulation} className="text-xs px-4 py-2 border rounded-lg hover:bg-white dark:hover:bg-[#0A0E17]">
              {isSimulating ? 'Dừng' : 'Chạy'}
            </button>
          </div>
        </div>

        {/* Machine Status Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-lg tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#003087]" /> Trạng thái máy (8 trạm)
            </div>
            <Link href="/line/mkz" className="text-sm text-[#003087] dark:text-[#60A5FA] flex items-center gap-1 hover:underline">
              Xem chi tiết sơ đồ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {machines.map((m) => (
                <motion.div key={m.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <MachineCard machine={m} onClick={() => handleMachineClick(m.code)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="text-xs text-[#94A3B8] mt-2">Click vào thẻ máy để xem chi tiết (sẽ mở rộng ở Giai đoạn 3)</div>
        </div>

        {/* Charts + Alerts */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Production Trend */}
          <div className="lg:col-span-3 card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Xu hướng sản lượng (Ca hiện tại)</div>
                <div className="text-xs text-[#64748B]">Đơn vị / 15 phút • Cập nhật realtime</div>
              </div>
              <TrendingUp className="w-5 h-5 text-[#003087]" />
            </div>
            <div className="h-72 -mx-1 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionHistory}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003087" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#003087" stopOpacity={0.03}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#003087" strokeWidth={2.5} fill="url(#colorProd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="lg:col-span-2 card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#E30613]" /> Cảnh báo gần đây
              </div>
              <div className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                {alerts.filter(a => !a.resolved).length} active
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-auto pr-1 max-h-[290px]">
              {alerts.length === 0 && (
                <div className="text-sm text-[#64748B] py-8 text-center">Không có cảnh báo.</div>
              )}
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onResolve={handleResolve} />
              ))}
            </div>

            <button 
              onClick={() => store.generateRandomAlert()}
              className="mt-4 text-xs w-full border py-2 rounded-lg hover:bg-[#F8F9FC] dark:hover:bg-white/5"
            >
              + Tạo cảnh báo mẫu (demo)
            </button>
          </div>
        </div>

        <div className="mt-6 text-[11px] text-center text-[#94A3B8] dark:text-slate-500">
          Simulation đang chạy • Dữ liệu chỉ mang tính minh họa • Giai đoạn 2/6 • Nhấn “Xem sơ đồ dây chuyền” để tiếp tục
        </div>
      </div>
    </div>
  )
}
