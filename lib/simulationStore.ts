// lib/simulationStore.ts
// Zustand store cho Simulation Realtime - FII LineGuard
// Đây là "trái tim" của demo: tự động thay đổi trạng thái máy, tăng sản lượng, tạo alert

import { create } from 'zustand'

export type MachineStatus = 'RUNNING' | 'IDLE' | 'ERROR' | 'MAINTENANCE' | 'OFFLINE'
export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface SimMachine {
  id: string
  code: string
  name: string
  category: string
  status: MachineStatus
  oee: number
  throughput: number
  totalProduced: number
  cycleTime: number
  errorCount: number
  plcConnected: boolean
  lastUpdate: Date
}

export interface SimAlert {
  id: string
  machineId?: string
  machineCode?: string
  machineName?: string
  severity: AlertSeverity
  message: string
  timestamp: Date
  resolved: boolean
}

interface SimulationState {
  // Core data
  machines: SimMachine[]
  alerts: SimAlert[]
  isSimulating: boolean
  simulationSpeed: number // 1 = normal, 2 = fast

  // Aggregates (live)
  overallOEE: number
  totalProducedToday: number
  runningCount: number
  errorCount: number
  maintenanceCount: number

  // Shift info
  currentShift: '1' | '2' | '3'
  shiftTarget: number
  shiftActual: number

  // History for charts (last ~40 points)
  productionHistory: Array<{ time: string; value: number }>

  // Actions
  initialize: (data: {
    machines: SimMachine[]
    alerts: SimAlert[]
    shiftTarget?: number
    shiftActual?: number
  }) => void
  startSimulation: () => void
  stopSimulation: () => void
  setSpeed: (speed: number) => void
  tick: () => void
  updateMachine: (id: string, updates: Partial<SimMachine>) => void
  resolveAlert: (id: string) => void
  generateRandomAlert: () => void
  resetSimulation: () => void
}

const TICK_INTERVAL_MS = 950

// Helper: realistic random walk
function randomWalk(current: number, min: number, max: number, volatility = 1.8) {
  const change = (Math.random() - 0.5) * volatility
  const next = Math.max(min, Math.min(max, current + change))
  return Math.round(next * 10) / 10
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  machines: [],
  alerts: [],
  isSimulating: true,
  simulationSpeed: 1,

  overallOEE: 87.4,
  totalProducedToday: 10842,
  runningCount: 5,
  errorCount: 1,
  maintenanceCount: 1,

  currentShift: '1',
  shiftTarget: 4200,
  shiftActual: 3850,

  productionHistory: Array.from({ length: 28 }, (_, i) => ({
    time: `${String(7 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
    value: 820 + Math.floor(Math.random() * 180),
  })),

  initialize: ({ machines, alerts, shiftTarget, shiftActual }) => {
    const running = machines.filter(m => m.status === 'RUNNING').length
    const errors = machines.filter(m => m.status === 'ERROR').length
    const maint = machines.filter(m => m.status === 'MAINTENANCE').length

    const avgOee = machines.length > 0
      ? machines.reduce((sum, m) => sum + m.oee, 0) / machines.length
      : 87

    set({
      machines: machines.map(m => ({ ...m, lastUpdate: new Date() })),
      alerts: alerts || [],
      runningCount: running,
      errorCount: errors,
      maintenanceCount: maint,
      overallOEE: Math.round(avgOee * 10) / 10,
      shiftTarget: shiftTarget || 4200,
      shiftActual: shiftActual || 3850,
    })
  },

  startSimulation: () => {
    set({ isSimulating: true })
  },

  stopSimulation: () => {
    set({ isSimulating: false })
  },

  setSpeed: (speed) => set({ simulationSpeed: clamp(speed, 0.5, 3) }),

  tick: () => {
    const state = get()
    if (!state.isSimulating || state.machines.length === 0) return

    const now = new Date()
    let producedThisTick = 0
    let newErrors = 0

    const updatedMachines = state.machines.map((machine) => {
      let newMachine = { ...machine, lastUpdate: now }

      // Different behavior per category / current status
      const isRunning = machine.status === 'RUNNING'
      const isError = machine.status === 'ERROR'
      const isMaint = machine.status === 'MAINTENANCE'

      if (isRunning) {
        // Normal production
        const baseThroughput = machine.throughput || 1600
        const variation = (Math.random() - 0.48) * 55
        newMachine.throughput = Math.max(1250, Math.min(2050, Math.round(baseThroughput + variation)))

        // Small OEE drift (good machines stay high)
        newMachine.oee = clamp(randomWalk(machine.oee, 82, 98.5, 0.6), 80, 99)

        // Increase production
        const unitsThisTick = Math.floor((newMachine.throughput / 3600) * (TICK_INTERVAL_MS / 1000) * (0.9 + Math.random() * 0.25))
        newMachine.totalProduced = machine.totalProduced + unitsThisTick
        producedThisTick += unitsThisTick

        // Small chance of error on some machines
        const errorProne = ['MKZ-04', 'MKZ-07', 'MKZ-08'].includes(machine.code)
        if (Math.random() < (errorProne ? 0.035 : 0.012)) {
          newMachine.status = 'ERROR'
          newMachine.errorCount = machine.errorCount + 1
          newErrors++
        }

        // Occasional idle for realism
        if (Math.random() < 0.008) {
          newMachine.status = 'IDLE'
        }
      } else if (machine.status === 'IDLE') {
        newMachine.throughput = Math.max(0, Math.floor(machine.throughput * 0.6))
        newMachine.oee = clamp(machine.oee - 0.3, 65, 85)

        // Chance to go back to running
        if (Math.random() < 0.22) {
          newMachine.status = 'RUNNING'
        }
      } else if (isError) {
        newMachine.throughput = 0
        newMachine.oee = clamp(machine.oee - 1.2, 35, 68)

        // Auto recovery chance (demo)
        if (Math.random() < 0.08) {
          newMachine.status = 'RUNNING'
          newMachine.oee = Math.max(68, newMachine.oee)
        }
      } else if (isMaint) {
        newMachine.throughput = 0
        // Maintenance machines slowly "recover"
        if (Math.random() < 0.04) {
          newMachine.status = 'IDLE'
        }
      }

      // Keep PLC connection realistic
      if (['MKZ-04', 'MKZ-08'].includes(machine.code)) {
        newMachine.plcConnected = newMachine.status !== 'ERROR' && Math.random() > 0.06
      } else {
        newMachine.plcConnected = Math.random() > 0.03
      }

      return newMachine
    })

    // Update aggregates
    const running = updatedMachines.filter(m => m.status === 'RUNNING').length
    const errors = updatedMachines.filter(m => m.status === 'ERROR').length
    const maint = updatedMachines.filter(m => m.status === 'MAINTENANCE').length

    const avgOee = updatedMachines.reduce((s, m) => s + m.oee, 0) / updatedMachines.length

    // Update production history (shift the array)
    const lastValue = state.productionHistory[state.productionHistory.length - 1]?.value || 920
    const newHistoryPoint = Math.round(lastValue * (0.96 + Math.random() * 0.12))
    const newHistory = [
      ...state.productionHistory.slice(1),
      {
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        value: newHistoryPoint,
      },
    ]

    // Occasionally generate new alert during simulation
    let newAlerts = [...state.alerts]
    if (newErrors > 0 && Math.random() < 0.75) {
      const errored = updatedMachines.find(m => m.status === 'ERROR' && !state.alerts.some(a => a.machineCode === m.code && !a.resolved))
      if (errored) {
        const sev: AlertSeverity = Math.random() > 0.6 ? 'ERROR' : 'CRITICAL'
        newAlerts = [
          {
            id: 'alert-' + Date.now(),
            machineId: errored.id,
            machineCode: errored.code,
            machineName: errored.name,
            severity: sev,
            message: `${errored.code}: ${errored.name.split(' ').slice(-1)[0]} gặp sự cố - ${['Mất encoder', 'Nhiệt độ cao', 'Lỗi giao tiếp PLC', 'Sensor position fail'][Math.floor(Math.random()*4)]}`,
            timestamp: now,
            resolved: false,
          },
          ...newAlerts,
        ].slice(0, 12) // keep recent only
      }
    }

    // Random minor alert sometimes
    if (Math.random() < 0.07) {
      get().generateRandomAlert()
    }

    const newTotal = state.totalProducedToday + Math.floor(producedThisTick * 0.9)

    set({
      machines: updatedMachines,
      alerts: newAlerts,
      overallOEE: Math.round(avgOee * 10) / 10,
      totalProducedToday: newTotal,
      runningCount: running,
      errorCount: errors,
      maintenanceCount: maint,
      productionHistory: newHistory,
      shiftActual: Math.min(state.shiftTarget + 180, state.shiftActual + Math.floor(producedThisTick / 1.8)),
    })
  },

  updateMachine: (id, updates) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === id ? { ...m, ...updates, lastUpdate: new Date() } : m
      ),
    }))
  },

  resolveAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, resolved: true } : a
      ),
    }))
  },

  generateRandomAlert: () => {
    const state = get()
    const candidates = state.machines.filter(m => m.status !== 'OFFLINE')
    if (candidates.length === 0) return

    const m = candidates[Math.floor(Math.random() * candidates.length)]
    const severities: AlertSeverity[] = ['INFO', 'WARNING', 'ERROR']
    const severity: AlertSeverity = severities[Math.floor(Math.random() * severities.length)]

    const messages = [
      'Cảnh báo nhiệt độ servo vượt mức',
      'Băng tải rung bất thường',
      'Lỗi đọc barcode station cuối',
      'Áp suất khí nén thấp',
      'Cảm biến quang học bị che',
    ]

    const newAlert: SimAlert = {
      id: 'sim-' + Date.now(),
      machineId: m.id,
      machineCode: m.code,
      machineName: m.name,
      severity,
      message: `${m.code}: ${messages[Math.floor(Math.random() * messages.length)]}`,
      timestamp: new Date(),
      resolved: false,
    }

    set((s) => ({
      alerts: [newAlert, ...s.alerts].slice(0, 12),
    }))
  },

  resetSimulation: () => {
    // Can be called to restart from seed values if needed
    set({
      isSimulating: true,
      simulationSpeed: 1,
    })
  },
}))

// Auto tick loop (runs globally when simulating)
let tickTimer: ReturnType<typeof setInterval> | null = null

export function startGlobalSimulation() {
  if (tickTimer) return

  tickTimer = setInterval(() => {
    const store = useSimulationStore.getState()
    if (store.isSimulating) {
      store.tick()
    }
  }, TICK_INTERVAL_MS)
}

export function stopGlobalSimulation() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}
