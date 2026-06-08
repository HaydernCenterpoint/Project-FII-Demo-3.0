'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { 
  Server, Cpu, Wrench, TestTube, Eye, Package, Truck, 
  AlertTriangle, Play, Pause, Settings 
} from 'lucide-react'
import { SimMachine } from '@/lib/simulationStore'

interface MachineNodeData {
  machine: SimMachine
  isSelected?: boolean
}

const categoryIcons: Record<string, React.ElementType> = {
  FEEDING: Server,
  ASSEMBLY: Wrench,
  TESTING: TestTube,
  QC: Eye,
  PACKAGING: Package,
  OUTFEED: Truck,
}

const statusColors: Record<string, string> = {
  RUNNING: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  IDLE: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
  ERROR: 'border-red-500 bg-red-50 dark:bg-red-950/30',
  MAINTENANCE: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30',
  OFFLINE: 'border-slate-400 bg-slate-50 dark:bg-slate-950/30',
}

const statusDot: Record<string, string> = {
  RUNNING: 'bg-emerald-500 status-running',
  IDLE: 'bg-amber-500',
  ERROR: 'bg-red-500 status-error',
  MAINTENANCE: 'bg-orange-500',
  OFFLINE: 'bg-slate-400',
}

function MachineNode({ data, selected }: NodeProps) {
  const safeData = (data || {}) as Partial<MachineNodeData>
  const machine = safeData.machine
  if (!machine) {
    return <div className="react-flow__node-machine p-3 text-xs text-[#64748B]">Loading...</div>
  }
  const Icon = categoryIcons[machine.category] || Cpu
  const colorClass = statusColors[machine.status] || statusColors.OFFLINE
  const dotClass = statusDot[machine.status] || 'bg-slate-400'

  return (
    <div 
      className={`
        react-flow__node-machine group min-w-[178px] rounded-xl border-2 shadow-md transition-all
        ${colorClass} 
        ${selected ? 'ring-2 ring-[#003087] dark:ring-[#60A5FA] ring-offset-2' : ''}
        ${machine.status === 'ERROR' ? 'animate-pulse' : ''}
      `}
    >
      {/* Input handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 !bg-[#003087] border-2 border-white dark:border-[#0A0E17]" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-[#003087] border-2 border-white dark:border-[#0A0E17]" 
      />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-white/70 dark:bg-black/20`}>
              <Icon className="w-4 h-4 text-[#003087] dark:text-[#60A5FA]" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-[#64748B] tracking-[0.5px]">{machine.code}</div>
              <div className="font-semibold text-sm leading-tight pr-1">{machine.name}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <div className={`status-dot ${dotClass} mt-1`} />
          </div>
        </div>

        {/* Category badge */}
        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-black/30 text-[#003087] dark:text-white mb-2">
          {machine.category}
        </div>

        {/* Live metrics */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-center text-xs">
          <div>
            <div className="text-[9px] text-[#64748B] tracking-wider">OEE</div>
            <div className="font-semibold tabular-nums text-base leading-none mt-px">
              {machine.oee.toFixed(1)}
              <span className="text-[10px]">%</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#64748B] tracking-wider">THP</div>
            <div className="font-semibold tabular-nums text-base leading-none mt-px">
              {machine.throughput}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#64748B] tracking-wider">SX</div>
            <div className="font-semibold tabular-nums text-sm leading-none mt-0.5">
              {(machine.totalProduced / 1000).toFixed(1)}k
            </div>
          </div>
        </div>

        {/* Status line */}
        <div className="mt-2.5 pt-2 border-t border-white/40 dark:border-white/10 flex items-center justify-between text-[10px]">
          <span className="font-medium text-[#334155] dark:text-slate-300">
            {machine.status}
          </span>
          <span className="font-mono text-[#64748B]">
            {machine.plcConnected ? 'PLC' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Output handles */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-[#003087] border-2 border-white dark:border-[#0A0E17]" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-[#003087] border-2 border-white dark:border-[#0A0E17]" 
      />
    </div>
  )
}

export default memo(MachineNode)
