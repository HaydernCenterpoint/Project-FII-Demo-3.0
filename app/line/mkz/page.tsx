'use client'

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  Edge, 
  Node, 
  Panel,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { 
  ArrowLeft, Play, Pause, RotateCcw, Save, Download, 
  Plus, Trash2, Undo, Redo, Search, Filter, Settings as SettingsIcon 
} from 'lucide-react'
import { useSimulationStore, SimMachine } from '@/lib/simulationStore'
import { useAuthStore } from '@/lib/authStore'
import MachineNode from '@/components/flow/MachineNode'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const nodeTypes = {
  machine: MachineNode,
}

// Initial layout replicating the original diagram (2 feeding stations parallel) + extended logical flow
const INITIAL_NODES: Node[] = [
  // Feeding stations - parallel like in the original image
  { 
    id: 'MKZ-01', 
    type: 'machine', 
    position: { x: 80, y: 120 }, 
    data: { machine: null } 
  },
  { 
    id: 'MKZ-02', 
    type: 'machine', 
    position: { x: 340, y: 120 }, 
    data: { machine: null } 
  },
  // Converge into main line
  { 
    id: 'MKZ-03', 
    type: 'machine', 
    position: { x: 210, y: 260 }, 
    data: { machine: null } 
  },
  { 
    id: 'MKZ-04', 
    type: 'machine', 
    position: { x: 210, y: 380 }, 
    data: { machine: null } 
  },
  { 
    id: 'MKZ-05', 
    type: 'machine', 
    position: { x: 210, y: 500 }, 
    data: { machine: null } 
  },
  { 
    id: 'MKZ-06', 
    type: 'machine', 
    position: { x: 210, y: 620 }, 
    data: { machine: null } 
  },
  { 
    id: 'MKZ-07', 
    type: 'machine', 
    position: { x: 210, y: 740 }, 
    data: { machine: null } 
  },
  { 
    id: 'MKZ-08', 
    type: 'machine', 
    position: { x: 210, y: 860 }, 
    data: { machine: null } 
  },
]

const INITIAL_EDGES: Edge[] = [
  // Parallel feeding converge
  { id: 'e1-3', source: 'MKZ-01', target: 'MKZ-03', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
  { id: 'e2-3', source: 'MKZ-02', target: 'MKZ-03', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
  // Main sequential flow
  { id: 'e3-4', source: 'MKZ-03', target: 'MKZ-04', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
  { id: 'e4-5', source: 'MKZ-04', target: 'MKZ-05', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
  { id: 'e5-6', source: 'MKZ-05', target: 'MKZ-06', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
  { id: 'e6-7', source: 'MKZ-06', target: 'MKZ-07', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
  { id: 'e7-8', source: 'MKZ-07', target: 'MKZ-08', animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } },
]

interface MachineDrawerProps {
  machineCode: string | null
  onClose: () => void
}

function MachineDrawer({ machineCode, onClose }: MachineDrawerProps) {
  const { machines, updateMachine } = useSimulationStore()
  const { canWritePLC } = useAuthStore()
  const machine = machines.find(m => m.code === machineCode)

  if (!machine) return null

  const handleTogglePLC = () => {
    const newConnected = !machine.plcConnected
    updateMachine(machine.id, { plcConnected: newConnected })
    toast.success(newConnected ? 'PLC đã kết nối' : 'Đã ngắt kết nối PLC (demo)')
  }

  const handleSimulateError = () => {
    updateMachine(machine.id, { 
      status: 'ERROR', 
      errorCount: machine.errorCount + 1,
      throughput: 0 
    })
    toast.error(`Máy ${machine.code} chuyển sang trạng thái LỖI (simulation)`)
  }

  const handleRecover = () => {
    updateMachine(machine.id, { 
      status: 'RUNNING', 
      oee: Math.max(machine.oee, 78),
      throughput: Math.max(machine.throughput, 1400)
    })
    toast.success(`Máy ${machine.code} đã khôi phục`)
  }

  return (
    <AnimatePresence>
      {machineCode && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-black/40" 
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-white dark:bg-[var(--background-dark)] border-l border-[var(--border)] dark:border-white/10 shadow-2xl overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="font-mono text-sm text-[text-slate-500]">{machine.code}</div>
                  <div className="text-2xl font-semibold tracking-tight">{machine.name}</div>
                  <div className="mt-1 inline-block px-3 py-0.5 text-xs font-medium rounded-full bg-[var(--primary)]/10 text-[var(--primary)] dark:bg-white/10 dark:text-white">
                    {machine.category}
                  </div>
                </div>
                <button onClick={onClose} className="text-2xl leading-none text-[text-slate-500] hover:text-black dark:hover:text-white">×</button>
              </div>

              {/* Live Status */}
              <div className="card p-4 mb-6">
                <div className="text-xs tracking-widest text-[text-slate-500] mb-2">TRẠNG THÁI REALTIME</div>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-semibold tabular-nums">{machine.status}</div>
                  <div className={`px-4 py-1 rounded-full text-sm font-medium ${machine.status === 'RUNNING' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : machine.status === 'ERROR' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                    {machine.oee.toFixed(1)}% OEE
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>Throughput: <span className="font-semibold">{machine.throughput}</span></div>
                  <div>Sản lượng: <span className="font-semibold">{machine.totalProduced.toLocaleString()}</span></div>
                  <div>Lỗi: <span className="font-semibold">{machine.errorCount}</span></div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[text-slate-500]">Model / Serial</span>
                  <span className="font-medium">MKZ-ASM-03 • FII-2024-88123</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[text-slate-500]">Nhà cung cấp</span>
                  <span className="font-medium">Foxconn Automation</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[text-slate-500]">Ngày lắp đặt</span>
                  <span className="font-medium">15/03/2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[text-slate-500]">Cycle time</span>
                  <span className="font-medium">{machine.cycleTime}s</span>
                </div>
              </div>

              {/* Full PLC Connection & Control (Phase 4) */}
              <div className="mb-6">
                <div className="text-xs tracking-widest text-[text-slate-500] mb-2">KẾT NỐI PLC &amp; ĐIỀU KHIỂN</div>
                <div className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Protocol: MODBUS TCP</div>
                      <div className="text-xs">IP: 192.168.10.10{machine.code.slice(-1)} • Port: 502</div>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-medium ${machine.plcConnected ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {machine.plcConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </div>
                  </div>

                  {/* PLC Form */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[text-slate-500]">IP Address</div>
                      <input defaultValue={`192.168.10.10${machine.code.slice(-1)}`} className="w-full border rounded px-2 py-1 bg-white dark:bg-[var(--card-dark)] text-xs" />
                    </div>
                    <div>
                      <div className="text-[text-slate-500]">Port</div>
                      <input defaultValue="502" className="w-full border rounded px-2 py-1 bg-white dark:bg-[var(--card-dark)] text-xs" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[text-slate-500] text-xs mb-1">Tag Mapping (JSON)</div>
                    <textarea defaultValue={`{"status":"hr:300${machine.code.slice(-1)}","count":"hr:3105","reset":"coil:100${machine.code.slice(-1)}"}`} className="w-full h-16 text-xs font-mono border rounded p-2 bg-[var(--background)] dark:bg-black/30" />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={handleTogglePLC}
                      className="flex-1 h-8 rounded border text-xs font-medium"
                    >
                      Test Connection
                    </button>
                    {canWritePLC() ? (
                      <>
                        <button onClick={() => {
                          updateMachine(machine.id, { throughput: machine.throughput + 150 })
                          toast.success('Write thành công: Tăng throughput (demo)')
                        }} className="flex-1 h-8 rounded bg-[var(--primary)] text-white text-xs font-medium">WRITE +150</button>
                        <button onClick={handleSimulateError} className="flex-1 h-8 rounded border text-xs text-red-600">Sim ERROR</button>
                      </>
                    ) : (
                      <div className="text-xs text-[text-slate-400] flex-1 text-center pt-1.5">Chỉ Kỹ Sư + Chủ Quản được WRITE</div>
                    )}
                  </div>
                  <div className="text-[10px] text-[text-slate-500]">Heartbeat: 5s • Last sync: vừa xong</div>
                </div>
              </div>

              {/* Troubleshooting Guide (from seed) */}
              <div className="mb-6">
                <div className="text-xs tracking-widest text-[text-slate-500] mb-2">HƯỚNG DẪN KHẮC PHỤC SỰ CỐ</div>
                <div className="card p-4 text-sm space-y-2">
                  <div className="font-medium">Lỗi phổ biến: Mất tín hiệu encoder / Nhiệt độ cao</div>
                  <ol className="list-decimal pl-5 text-[#475569] dark:text-slate-300 space-y-1 text-xs">
                    <li>Kiểm tra cáp kết nối encoder (cổng X1)</li>
                    <li>Reset lỗi từ HMI hoặc tủ điện</li>
                    <li>Chạy thử 5 chu kỳ không tải</li>
                    <li>Nếu vẫn lỗi → chuyển sang trạm rework</li>
                  </ol>
                  <button className="mt-2 text-xs text-[var(--primary)] hover:underline">Xem đầy đủ hướng dẫn →</button>
                </div>
              </div>

              {/* Advanced Settings stub */}
              <div>
                <div className="text-xs tracking-widest text-[text-slate-500] mb-2">SETTING NÂNG CAO</div>
                <div className="card p-4 text-sm">
                  <div className="text-[text-slate-500] text-xs mb-2">Tag mapping (Modbus)</div>
                  <div className="font-mono text-xs bg-[var(--background)] dark:bg-black/30 p-2 rounded">coil:100{machine.code.slice(-1)} • hr:3005</div>
                  <button className="mt-3 w-full h-9 text-sm border rounded-lg hover:bg-white dark:hover:bg-[var(--card-dark)]">
                    Chỉnh sửa tag mapping (Kỹ sư + Chủ Quản)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function MKZLineContent() {
  const { machines, isSimulating, startSimulation, stopSimulation } = useSimulationStore()
  const { user, canWritePLC } = useAuthStore()
  
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'diagram' | 'list' | 'settings'>('diagram')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const { fitView } = useReactFlow()

  // Sync live machine data from simulation store into nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const liveMachine = machines.find((m) => m.code === node.id)
        if (liveMachine) {
          return {
            ...node,
            data: {
              ...node.data,
              machine: liveMachine,
            },
          }
        }
        return node
      })
    )
  }, [machines, setNodes])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          deleteSelected()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo() 
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveLayout()
      }
      if (e.key.toLowerCase() === 'f' && activeTab === 'diagram') {
        e.preventDefault()
        fitView({ duration: 400 })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, activeTab])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--primary)', strokeWidth: 2 } }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  // Save current positions to history for undo
  const pushHistory = (newNodes: Node[]) => {
    const snapshot = newNodes.map(n => ({ id: n.id, position: { ...n.position } }))
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)
    setHistory(newHistory.slice(-20)) // keep last 20
    setHistoryIndex(newHistory.length - 1)
  }

  const onNodesChangeWithHistory = (changes: any) => {
    onNodesChange(changes)
    // Only push history on position changes (drag end)
    if (changes.some((c: any) => c.type === 'position')) {
      setTimeout(() => {
        setNodes((current) => {
          pushHistory(current)
          return current
        })
      }, 50)
    }
  }

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setNodes(nds => nds.map(n => {
        const saved = prev.find((p: any) => p.id === n.id)
        return saved ? { ...n, position: saved.position } : n
      }))
      setHistoryIndex(historyIndex - 1)
      toast.info('Đã hoàn tác')
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setNodes(nds => nds.map(n => {
        const saved = next.find((p: any) => p.id === n.id)
        return saved ? { ...n, position: saved.position } : n
      }))
      setHistoryIndex(historyIndex + 1)
      toast.info('Đã làm lại')
    }
  }

  const deleteSelected = () => {
    if (!selectedNode) return
    setNodes(nds => nds.filter(n => n.id !== selectedNode))
    setEdges(eds => eds.filter(e => e.source !== selectedNode && e.target !== selectedNode))
    setSelectedNode(null)
    toast.success('Đã xóa máy khỏi sơ đồ')
  }

  const saveLayout = () => {
    const layout = nodes.map(n => ({ id: n.id, position: n.position }))
    localStorage.setItem('fii-mkz-layout', JSON.stringify(layout))
    toast.success('Đã lưu layout sơ đồ')
  }

  const resetLayout = () => {
    setNodes(INITIAL_NODES.map(n => ({ ...n, data: { machine: machines.find(m => m.code === n.id) || null } })))
    setEdges(INITIAL_EDGES)
    setHistory([])
    setHistoryIndex(-1)
    localStorage.removeItem('fii-mkz-layout')
    setTimeout(() => fitView({ duration: 600 }), 100)
    toast('Đã reset về layout ban đầu')
  }

  const loadSavedLayout = () => {
    const saved = localStorage.getItem('fii-mkz-layout')
    if (saved) {
      try {
        const layout = JSON.parse(saved)
        setNodes(nds =>
          nds.map(node => {
            const pos = layout.find((l: any) => l.id === node.id)
            return pos ? { ...node, position: pos.position } : node
          })
        )
        toast.success('Đã tải layout đã lưu')
      } catch {}
    }
  }

  // Export current diagram state to PDF (professional report)
  const exportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(18)
    doc.text('FII LineGuard - Sơ đồ Dây chuyền MKZ', pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(11)
    doc.text('Foxconn Industrial Internet • MCKENZIE AUTO LINE', pageWidth / 2, 28, { align: 'center' })
    doc.text(`Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`, pageWidth / 2, 35, { align: 'center' })

    // Current status table
    const tableData = machines.map(m => [
      m.code,
      m.name,
      m.category,
      m.status,
      `${m.oee.toFixed(1)}%`,
      m.throughput.toString(),
      m.totalProduced.toLocaleString()
    ])

    autoTable(doc, {
      startY: 45,
      head: [['Mã', 'Tên máy', 'Loại', 'Trạng thái', 'OEE', 'Throughput', 'Sản lượng']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 48, 135] },
    })

    doc.setFontSize(10)
    doc.text('Ghi chú: Dữ liệu lấy từ simulation realtime. Layout sơ đồ có thể được lưu riêng.', 14, 200)

    doc.save(`FII-MKZ-Diagram-${new Date().toISOString().slice(0,10)}.pdf`)
    toast.success('Đã xuất báo cáo PDF')
  }

  const exportLayoutJSON = () => {
    const layout = {
      nodes: nodes.map(n => ({ id: n.id, position: n.position })),
      edges: edges,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mkz-flow-layout.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất layout JSON')
  }

  // Add a new machine (demo)
  const addMachine = () => {
    const newCode = `MKZ-${String(nodes.length + 9).padStart(2, '0')}`
    const newNode: Node = {
      id: newCode,
      type: 'machine',
      position: { x: 420 + Math.random() * 120, y: 300 + Math.random() * 400 },
      data: { machine: null },
    }
    setNodes(nds => [...nds, newNode])
    toast.success(`Đã thêm máy mới ${newCode} (demo)`)
  }

  // Filtered machines for list tab
  const filteredMachines = useMemo(() => {
    return machines
      .filter(m => 
        (m.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
         m.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === 'ALL' || m.status === statusFilter)
      )
  }, [machines, searchTerm, statusFilter])

  // Load saved layout on mount
  useEffect(() => {
    loadSavedLayout()
    // Initial sync of machine data
    setTimeout(() => {
      setNodes(nds => nds.map(n => ({
        ...n,
        data: { machine: machines.find(m => m.code === n.id) || null }
      })))
      fitView({ duration: 300 })
    }, 200)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--background-dark)] flex flex-col">
      {/* Top controls (Header is global) */}
      <div className="max-w-7xl mx-auto px-6 pt-3 flex justify-end gap-2 text-sm">
        <button 
          onClick={() => isSimulating ? stopSimulation() : startSimulation()}
          className={`flex items-center gap-1.5 px-4 h-8 rounded-lg border text-sm ${isSimulating ? 'border-emerald-500 text-emerald-600' : ''}`}
        >
          {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isSimulating ? 'Dừng Simulation' : 'Chạy Simulation'}
        </button>
        <button onClick={saveLayout} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border hover:bg-white dark:hover:bg-[var(--card-dark)]">
          <Save className="w-4 h-4" /> Lưu layout
        </button>
        <button onClick={resetLayout} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border hover:bg-white dark:hover:bg-[var(--card-dark)]">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] dark:border-white/10 bg-white dark:bg-[var(--background-dark)]">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {[
            { key: 'diagram', label: 'Sơ đồ dây chuyền' },
            { key: 'list', label: 'Danh sách máy' },
            { key: 'settings', label: 'Cài đặt dây chuyền' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.key ? 'border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary-dark)] dark:border-[var(--primary-dark)]' : 'border-transparent text-[text-slate-500] hover:text-[var(--primary)]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {activeTab === 'diagram' && (
          <div className="h-[calc(100vh-180px)] rounded-2xl border border-[var(--border)] dark:border-white/10 overflow-hidden bg-white dark:bg-[var(--card-dark)] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChangeWithHistory}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[20, 20]}
              className="bg-[var(--background)] dark:bg-[var(--background-dark)]"
            >
              <Background color="var(--primary)" gap={24} size={1.5} />
              <Controls />
              <MiniMap 
                nodeColor={(n) => {
                  const m = n.data?.machine as SimMachine | undefined
                  if (!m) return 'text-slate-500'
                  return m.status === 'RUNNING' ? '#10b981' : m.status === 'ERROR' ? '#ef4444' : '#f59e0b'
                }}
                maskColor="rgba(0,48,135,0.08)"
              />

              {/* Toolbar Panel */}
              <Panel position="top-left" className="bg-white/95 dark:bg-[var(--background-dark)]/95 backdrop-blur border rounded-xl p-2 shadow flex gap-1.5 m-3">
                <button onClick={addMachine} className="flex items-center gap-1 px-3 h-8 text-sm rounded-lg border hover:bg-[var(--background)] dark:hover:bg-white/5">
                  <Plus className="w-4 h-4" /> Thêm máy
                </button>
                <button onClick={deleteSelected} disabled={!selectedNode} className="flex items-center gap-1 px-3 h-8 text-sm rounded-lg border hover:bg-red-50 disabled:opacity-40">
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
                <div className="w-px h-8 bg-[var(--border)] dark:bg-white/10 mx-1" />
                <button onClick={undo} disabled={historyIndex <= 0} className="flex items-center gap-1 px-3 h-8 text-sm rounded-lg border hover:bg-[var(--background)] disabled:opacity-40">
                  <Undo className="w-4 h-4" /> Undo
                </button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className="flex items-center gap-1 px-3 h-8 text-sm rounded-lg border hover:bg-[var(--background)] disabled:opacity-40">
                  <Redo className="w-4 h-4" /> Redo
                </button>
                <div className="w-px h-8 bg-[var(--border)] dark:bg-white/10 mx-1" />
                <button onClick={exportPDF} className="flex items-center gap-1 px-3 h-8 text-sm rounded-lg border hover:bg-[var(--background)]">
                  <Download className="w-4 h-4" /> PDF
                </button>
                <button onClick={exportLayoutJSON} className="flex items-center gap-1 px-3 h-8 text-sm rounded-lg border hover:bg-[var(--background)]">
                  JSON
                </button>
              </Panel>

              <Panel position="top-right" className="m-3 text-xs bg-white/90 dark:bg-[var(--card-dark)]/90 px-3 py-1 rounded border">
                Kéo thả node • Nhấp để xem chi tiết • Ctrl/Cmd+Z Undo • Delete xóa • F fit view
              </Panel>
            </ReactFlow>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 w-4 h-4 text-[text-slate-500]" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm mã hoặc tên máy..." 
                  className="pl-9 w-full h-10 rounded-lg border bg-white dark:bg-[var(--card-dark)] text-sm"
                />
              </div>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border bg-white dark:bg-[var(--card-dark)] text-sm px-3"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="RUNNING">RUNNING</option>
                <option value="IDLE">IDLE</option>
                <option value="ERROR">ERROR</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
              <div className="text-sm text-[text-slate-500] ml-auto">{filteredMachines.length} máy</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[text-slate-500] text-xs tracking-wider">
                    <th className="py-3">Mã</th>
                    <th>Tên máy</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th>OEE</th>
                    <th>Throughput</th>
                    <th>Sản lượng</th>
                    <th>PLC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map(m => (
                    <tr key={m.code} onClick={() => { setActiveTab('diagram'); setSelectedNode(m.code) }} className="border-b last:border-0 hover:bg-[var(--background)] dark:hover:bg-white/5 cursor-pointer">
                      <td className="py-3 font-mono text-[var(--primary)]">{m.code}</td>
                      <td>{m.name}</td>
                      <td><span className="text-xs px-2 py-0.5 rounded bg-[var(--primary)]/5">{m.category}</span></td>
                      <td><span className={`text-xs px-2 py-0.5 rounded ${m.status === 'RUNNING' ? 'bg-emerald-100 text-emerald-700' : m.status === 'ERROR' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span></td>
                      <td className="font-semibold">{m.oee.toFixed(1)}%</td>
                      <td>{m.throughput}</td>
                      <td>{m.totalProduced.toLocaleString()}</td>
                      <td>{m.plcConnected ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card p-6 max-w-2xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Cấu hình PLC chung - MKZ Line</h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-[text-slate-500]">Protocol mặc định</label>
                <select className="w-full h-10 border rounded-lg mt-1 px-3 bg-white dark:bg-[var(--card-dark)]">
                  <option>MODBUS TCP</option>
                  <option>SIEMENS S7</option>
                  <option>OPC UA</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[text-slate-500]">IP Range</label>
                  <input className="w-full h-10 border rounded-lg mt-1 px-3 bg-white dark:bg-[var(--card-dark)]" defaultValue="192.168.10.10x" />
                </div>
                <div>
                  <label className="text-xs text-[text-slate-500]">Heartbeat (ms)</label>
                  <input type="number" className="w-full h-10 border rounded-lg mt-1 px-3 bg-white dark:bg-[var(--card-dark)]" defaultValue="5000" />
                </div>
              </div>
              <button className="mt-4 btn-fii w-full h-10 rounded-xl">Lưu cấu hình PLC (Yêu cầu quyền Kỹ sư)</button>
            </div>
            <p className="text-xs text-[text-slate-400] mt-6">Cấu hình tag chi tiết từng máy được quản lý trong Drawer máy.</p>
          </div>
        )}
      </div>

      {/* Machine Detail Drawer */}
      <MachineDrawer machineCode={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}

export default function MKZLinePage() {
  return (
    <ReactFlowProvider>
      <MKZLineContent />
    </ReactFlowProvider>
  )
}
