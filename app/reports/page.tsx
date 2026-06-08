'use client'

import React, { useState, useMemo } from 'react'
import { useSimulationStore, SimMachine } from '@/lib/simulationStore'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts'
import { Download, Filter, Calendar } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, subDays } from 'date-fns'

export default function ReportsPage() {
  const { machines, alerts } = useSimulationStore()

  // Filters
  const [dateRange, setDateRange] = useState({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })
  const [selectedShift, setSelectedShift] = useState<'ALL' | '1' | '2' | '3'>('ALL')
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filteredMachines = useMemo(() => {
    return machines.filter(m => 
      (selectedMachine === 'ALL' || m.code === selectedMachine) &&
      (statusFilter === 'ALL' || m.status === statusFilter)
    )
  }, [machines, selectedMachine, statusFilter])

  // Simulated historical data for charts (based on current + some variation for demo)
  const productionTrend = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      time: `${String(7 + Math.floor(i / 2)).padStart(2,'0')}:${i % 2 === 0 ? '00' : '30'}`,
      actual: Math.floor(820 + Math.sin(i / 3) * 120 + (Math.random() - 0.5) * 80),
      target: 920,
    }))
  }, [])

  const oeeByMachine = filteredMachines.map(m => ({
    name: m.code,
    OEE: Math.round(m.oee),
    Availability: Math.round(m.oee * 0.98),
    Performance: Math.round(m.oee * 0.95),
    Quality: Math.round(m.oee * 1.02),
  }))

  const statusDistribution = [
    { name: 'RUNNING', value: machines.filter(m => m.status === 'RUNNING').length, color: '#10b981' },
    { name: 'IDLE', value: machines.filter(m => m.status === 'IDLE').length, color: '#f59e0b' },
    { name: 'ERROR', value: machines.filter(m => m.status === 'ERROR').length, color: '#ef4444' },
    { name: 'MAINTENANCE', value: machines.filter(m => m.status === 'MAINTENANCE').length, color: '#f97316' },
  ]

  // Pareto style downtime (simulated from error counts)
  const downtimePareto = [...machines]
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 6)
    .map((m, idx) => ({
      machine: m.code,
      errors: m.errorCount,
      cumulative: Math.round((m.errorCount / machines.reduce((s, x) => s + x.errorCount, 0)) * 100),
    }))

  // OEE calculation (demo formula)
  const overallOEE = filteredMachines.length > 0 
    ? filteredMachines.reduce((sum, m) => sum + m.oee, 0) / filteredMachines.length 
    : 0

  // Export Excel multi-sheet
  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Tổng hợp
    const summary = [
      ['Báo cáo Tổng hợp MKZ', '', ''],
      ['Thời điểm', new Date().toLocaleString('vi-VN'), ''],
      ['OEE Tổng thể', overallOEE.toFixed(1) + '%', ''],
      ['Máy đang chạy', `${machines.filter(m => m.status === 'RUNNING').length}/${machines.length}`, ''],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Tổng hợp')

    // Sheet 2: Chi tiết máy
    const machineData = filteredMachines.map(m => ({
      'Mã': m.code, 'Tên': m.name, 'Loại': m.category, 'Trạng thái': m.status,
      'OEE': m.oee, 'Throughput': m.throughput, 'Sản lượng': m.totalProduced, 'Lỗi': m.errorCount, 'PLC': m.plcConnected ? 'OK' : 'Mất'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(machineData), 'Chi tiết máy')

    // Sheet 3: Raw data (alerts)
    const alertData = alerts.map(a => ({
      'Thời gian': a.timestamp.toLocaleString('vi-VN'),
      'Máy': a.machineCode || 'GEN',
      'Mức độ': a.severity,
      'Nội dung': a.message,
      'Đã xử lý': a.resolved ? 'Có' : 'Chưa'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alertData), 'Cảnh báo')

    XLSX.writeFile(wb, `FII-MKZ-Report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  // Export enhanced PDF
  const exportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header with FII branding
    doc.setFillColor(0, 48, 135)
    doc.rect(0, 0, pageWidth, 22, 'F')
    doc.setTextColor(255)
    doc.setFontSize(16)
    doc.text('FII LineGuard - Báo cáo Thống kê Dây chuyền MKZ', pageWidth / 2, 14, { align: 'center' })
    doc.setFontSize(9)
    doc.text('Foxconn Industrial Internet', pageWidth / 2, 20, { align: 'center' })

    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(`Ngày: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Ca: ${selectedShift} | OEE: ${overallOEE.toFixed(1)}%`, 14, 32)

    // KPI summary
    autoTable(doc, {
      startY: 38,
      body: [
        ['OEE Tổng thể', `${overallOEE.toFixed(1)}%`, 'Máy chạy', `${machines.filter(m => m.status === 'RUNNING').length}/${machines.length}`],
        ['Sản lượng ca', filteredMachines.reduce((s, m) => s + m.totalProduced, 0).toLocaleString(), 'Cảnh báo active', alerts.filter(a => !a.resolved).length.toString()],
      ],
      styles: { fontSize: 10 },
    })

    // Machine table
    const tableRows = filteredMachines.map(m => [m.code, m.name, m.status, `${m.oee.toFixed(1)}%`, m.throughput, m.totalProduced.toLocaleString(), m.errorCount])
    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 10 || 70,
      head: [['Mã', 'Tên máy', 'Trạng thái', 'OEE', 'Throughput', 'Sản lượng', 'Lỗi']],
      body: tableRows,
      headStyles: { fillColor: [0, 48, 135] },
      styles: { fontSize: 8 },
    })

    // Footer
    doc.setFontSize(8)
    doc.text('Báo cáo được tạo tự động từ FII LineGuard • Dữ liệu simulation', 14, 285)
    doc.text('Trang 1/1', pageWidth - 30, 285)

    doc.save(`FII-MKZ-BaoCao-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="uppercase tracking-[2px] text-xs text-[#003087] dark:text-[#60A5FA]">THỐNG KÊ & BÁO CÁO</div>
          <h1 className="text-3xl font-semibold tracking-tighter">Báo cáo Dây chuyền MKZ</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 h-9 rounded-lg border text-sm hover:bg-white dark:hover:bg-[#111827]">
            <Download className="w-4 h-4" /> Xuất Excel (3 sheet)
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 h-9 rounded-lg bg-[#003087] text-white text-sm">
            <Download className="w-4 h-4" /> Xuất PDF chuyên nghiệp
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <div className="text-xs text-[#64748B] mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Khoảng ngày</div>
          <div className="flex gap-2">
            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="border rounded px-2 h-9 text-sm bg-white dark:bg-[#111827]" />
            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="border rounded px-2 h-9 text-sm bg-white dark:bg-[#111827]" />
          </div>
        </div>
        <div>
          <div className="text-xs text-[#64748B] mb-1">Ca làm việc</div>
          <select value={selectedShift} onChange={e => setSelectedShift(e.target.value as any)} className="border rounded px-3 h-9 text-sm bg-white dark:bg-[#111827]">
            <option value="ALL">Tất cả</option>
            <option value="1">Ca 1</option>
            <option value="2">Ca 2</option>
            <option value="3">Ca 3</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-[#64748B] mb-1">Máy</div>
          <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} className="border rounded px-3 h-9 text-sm bg-white dark:bg-[#111827]">
            <option value="ALL">Tất cả máy</option>
            {machines.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-[#64748B] mb-1">Trạng thái</div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-3 h-9 text-sm bg-white dark:bg-[#111827]">
            <option value="ALL">Tất cả</option>
            <option value="RUNNING">RUNNING</option>
            <option value="IDLE">IDLE</option>
            <option value="ERROR">ERROR</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>
        <button onClick={() => { setSelectedMachine('ALL'); setStatusFilter('ALL'); setSelectedShift('ALL') }} className="h-9 px-4 text-sm border rounded flex items-center gap-1">
          <Filter className="w-4 h-4" /> Xóa lọc
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-[#64748B]">OEE Tổng thể (A×P×Q)</div>
          <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-1">{overallOEE.toFixed(1)}%</div>
          <div className="text-xs text-emerald-600 mt-1">Availability × Performance × Quality</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[#64748B]">Máy đang chạy</div>
          <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-1">{machines.filter(m => m.status === 'RUNNING').length} / {machines.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[#64748B]">Tổng lỗi tích lũy</div>
          <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-1">{machines.reduce((s, m) => s + m.errorCount, 0)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[#64748B]">Cảnh báo chưa xử lý</div>
          <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-1 text-red-600">{alerts.filter(a => !a.resolved).length}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="font-semibold mb-3">Xu hướng sản lượng (24h)</div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={productionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#003087" strokeWidth={2} name="Thực tế" />
                <Line type="monotone" dataKey="target" stroke="#E30613" strokeDasharray="4 2" name="Mục tiêu" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="font-semibold mb-3">OEE theo máy (Breakdown)</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={oeeByMachine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="OEE" fill="#003087" />
                <Bar dataKey="Availability" fill="#60a5fa" />
                <Bar dataKey="Performance" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="font-semibold mb-3">Phân bố trạng thái máy</div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="font-semibold mb-3">Pareto lỗi (Top nguyên nhân dừng máy)</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={downtimePareto}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="machine" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="errors" fill="#E30613" name="Số lỗi" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed table */}
      <div className="card p-5">
        <div className="font-semibold mb-3">Bảng dữ liệu chi tiết (Filtered)</div>
        <div className="overflow-x-auto">
          <table className="table-industrial w-full text-sm">
            <thead>
              <tr>
                <th>Mã</th><th>Tên</th><th>Trạng thái</th><th>OEE</th><th>Throughput</th><th>Sản lượng</th><th>Lỗi</th><th>PLC</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map(m => (
                <tr key={m.code}>
                  <td className="font-mono">{m.code}</td>
                  <td>{m.name}</td>
                  <td>{m.status}</td>
                  <td>{m.oee.toFixed(1)}%</td>
                  <td>{m.throughput}</td>
                  <td>{m.totalProduced.toLocaleString()}</td>
                  <td>{m.errorCount}</td>
                  <td>{m.plcConnected ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 text-xs text-[#94A3B8] text-center">
        OEE = Availability (thời gian chạy) × Performance (tốc độ) × Quality (tỷ lệ đạt) • Dữ liệu kết hợp simulation + lịch sử seed
      </div>

      {/* Comparison Mode (Phase 6) */}
      <div className="card p-5 mt-6">
        <div className="font-semibold mb-3">So sánh 2 máy (Comparison)</div>
        <div className="flex gap-4 items-center">
          <select className="border rounded px-3 h-9 text-sm" defaultValue={machines[0]?.code}>
            {machines.map(m => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
          </select>
          <span>vs</span>
          <select className="border rounded px-3 h-9 text-sm" defaultValue={machines[3]?.code}>
            {machines.map(m => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
          </select>
          <button className="px-4 h-9 rounded bg-[#003087] text-white text-sm" onClick={() => alert('So sánh chi tiết sẽ mở biểu đồ overlay (demo hoàn tất)')}>So sánh OEE &amp; Downtime</button>
        </div>
      </div>

      {/* Maintenance Schedule (Phase 6) */}
      <div className="card p-5 mt-4">
        <div className="font-semibold mb-2">Lịch bảo trì gợi ý</div>
        <div className="text-sm text-[#475569] dark:text-slate-300">
          MKZ-08 (Palletizing): Bảo trì định kỳ sau 1200 giờ • Ưu tiên cao (đang MAINTENANCE).<br />
          MKZ-04: Kiểm tra encoder sau 3 lỗi liên tiếp.<br />
          Gợi ý: Lên lịch bảo trì vào ca 3 cho các máy có errorCount &gt; 8.
        </div>
        <button className="mt-3 text-xs px-3 h-8 border rounded">Tạo lịch bảo trì mới (demo)</button>
      </div>
    </div>
  )
}
