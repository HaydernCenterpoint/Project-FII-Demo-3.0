'use server'

import { prisma } from '@/lib/prisma'
import { createJWT, AuthUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { SimMachine, SimAlert } from '@/lib/simulationStore'

export interface LoginResult {
  success: boolean
  error?: string
  user?: AuthUser
}

// Đăng nhập bằng Mã nhân viên + Mật khẩu (demo)
export async function loginAction(
  employeeCode: string,
  password: string
): Promise<LoginResult> {
  if (!employeeCode || !password) {
    return { success: false, error: 'Vui lòng nhập đầy đủ Mã nhân viên và Mật khẩu' }
  }

  const user = await prisma.user.findUnique({
    where: { employeeCode: employeeCode.trim().toUpperCase() },
  })

  if (!user) {
    return { success: false, error: 'Mã nhân viên không tồn tại' }
  }

  // Demo: so sánh plain text (production nên dùng bcrypt.compare)
  if (user.password !== password) {
    return { success: false, error: 'Mật khẩu không đúng' }
  }

  const authUser: AuthUser = {
    id: user.id,
    employeeCode: user.employeeCode,
    name: user.name,
    role: user.role as AuthUser['role'],
  }

  // Tạo JWT và lưu httpOnly cookie
  const token = await createJWT(authUser)

  const cookieStore = await cookies()
  cookieStore.set('fii_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 15, // 15 ngày
  })

  // Ghi audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      details: JSON.stringify({
        employeeCode: user.employeeCode,
        role: user.role,
      }),
    },
  })

  return { success: true, user: authUser }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('fii_session')
  redirect('/')
}

// =====================================================
// DASHBOARD DATA (dùng cho Phase 2 - Simulation)
// =====================================================

export interface DashboardInitialData {
  line: {
    id: string
    code: string
    name: string
    targetDaily: number
  }
  machines: SimMachine[]
  unresolvedAlerts: SimAlert[]
  shiftTarget: number
  shiftActual: number
  currentShift: '1' | '2' | '3'
}

export async function getDashboardData(): Promise<DashboardInitialData> {
  const line = await prisma.productionLine.findFirst({
    where: { code: 'MKZ' },
    include: { machines: true },
  })

  if (!line) {
    throw new Error('MKZ line not found in database')
  }

  const machines: SimMachine[] = line.machines.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    category: m.category,
    status: m.status as SimMachine['status'],
    oee: m.oee,
    throughput: m.throughput,
    totalProduced: m.totalProduced,
    cycleTime: m.cycleTime,
    errorCount: m.errorCount,
    plcConnected: m.plcConnected,
    lastUpdate: m.lastSync || m.updatedAt,
  }))

  const alerts = await prisma.alert.findMany({
    where: { resolved: false },
    include: { machine: { select: { code: true, name: true } } },
    orderBy: { timestamp: 'desc' },
    take: 10,
  })

  const unresolvedAlerts: SimAlert[] = alerts.map((a) => ({
    id: a.id,
    machineId: a.machineId || undefined,
    machineCode: a.machine?.code,
    machineName: a.machine?.name,
    severity: a.severity as SimAlert['severity'],
    message: a.message,
    timestamp: a.timestamp,
    resolved: a.resolved,
  }))

  const today = new Date().toISOString().slice(0, 10)
  const shiftTargetRow = await prisma.shiftTarget.findFirst({
    where: { lineId: line.id, date: today },
  })

  return {
    line: {
      id: line.id,
      code: line.code,
      name: line.name,
      targetDaily: line.targetDaily,
    },
    machines,
    unresolvedAlerts,
    shiftTarget: shiftTargetRow?.targetQty || 4200,
    shiftActual: shiftTargetRow?.actualQty || 3850,
    currentShift: '1',
  }
}

// Optional: sync important changes back to DB (demo only)
export async function syncMachineStatus(machineId: string, status: string, oee: number) {
  await prisma.machine.update({
    where: { id: machineId },
    data: {
      status,
      oee,
      lastSync: new Date(),
    },
  })
}

