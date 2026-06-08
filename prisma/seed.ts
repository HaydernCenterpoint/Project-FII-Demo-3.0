// prisma/seed.ts
// Seed data cho FII LineGuard - MKZ (MCKENZIE AUTO LINE)
// Chạy: npm run seed

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu FII LineGuard...')

  // Xóa dữ liệu cũ (giữ idempotent cho dev)
  await prisma.auditLog.deleteMany()
  await prisma.troubleshootingGuide.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.machineLog.deleteMany()
  await prisma.pLCConfig.deleteMany()
  await prisma.machine.deleteMany()
  await prisma.shiftTarget.deleteMany()
  await prisma.productionLine.deleteMany()
  await prisma.user.deleteMany()

  // ========== 1. USERS (4 vai trò RBAC) ==========
  const users = await prisma.user.createMany({
    data: [
      {
        employeeCode: 'CQ001',
        name: 'Nguyễn Văn Quản',
        role: 'CHU_QUAN',
        password: 'admin123',
      },
      {
        employeeCode: 'TL002',
        name: 'Trần Thị Trợ Lý',
        role: 'TRO_LY',
        password: 'troly123',
      },
      {
        employeeCode: 'CT003',
        name: 'Lê Văn Chuyền',
        role: 'CHUYEN_TRUONG',
        password: 'chuyen123',
      },
      {
        employeeCode: 'KS004',
        name: 'Phạm Minh Kỹ Sư',
        role: 'KY_SU',
        password: 'kysu123',
      },
    ],
  })
  console.log(`✅ Đã tạo ${users.count} users (4 vai trò)`)

  // Lấy user để tham chiếu audit
  const chuQuan = await prisma.user.findUnique({ where: { employeeCode: 'CQ001' } })
  const kySu = await prisma.user.findUnique({ where: { employeeCode: 'KS004' } })

  // ========== 2. PRODUCTION LINE - MKZ ==========
  const mkzLine = await prisma.productionLine.create({
    data: {
      code: 'MKZ',
      name: 'MCKENZIE AUTO LINE',
      description: 'Dây chuyền lắp ráp tự động MCKENZIE - Sản xuất linh kiện điện tử ô tô. Sơ đồ mô phỏng ban đầu từ tài liệu Foxconn Industrial Internet.',
      status: 'RUNNING',
      targetDaily: 12500,
    },
  })
  console.log('✅ Đã tạo dây chuyền MKZ')

  const today = new Date().toISOString().slice(0, 10)

  // ========== 3. MACHINES (8 trạm - mở rộng từ sơ đồ 2 station) ==========
  // Replicate đúng 2 station đầu từ ảnh: Vỏ/Chassis và Bo mạch (song song feeding)
  const machinesData = [
    {
      code: 'MKZ-01',
      name: 'Cấp phôi Vỏ / Chassis',
      category: 'FEEDING',
      model: 'MKZ-FD-01',
      serial: 'FII-2024-88121',
      supplier: 'Foxconn Automation',
      status: 'RUNNING',
      oee: 94.2,
      throughput: 1850,
      cycleTime: 2.8,
      totalProduced: 12480,
      errorCount: 2,
      plcConnected: true,
    },
    {
      code: 'MKZ-02',
      name: 'Cấp Bo mạch (PCB)',
      category: 'FEEDING',
      model: 'MKZ-PCB-02',
      serial: 'FII-2024-88122',
      supplier: 'Foxconn Automation',
      status: 'RUNNING',
      oee: 91.8,
      throughput: 1830,
      cycleTime: 2.9,
      totalProduced: 12390,
      errorCount: 4,
      plcConnected: true,
    },
    {
      code: 'MKZ-03',
      name: 'Lắp ráp & Căn chỉnh chính',
      category: 'ASSEMBLY',
      model: 'MKZ-ASM-03',
      serial: 'FII-2024-88123',
      supplier: 'Siemens',
      status: 'RUNNING',
      oee: 88.5,
      throughput: 1790,
      cycleTime: 3.4,
      totalProduced: 12150,
      errorCount: 7,
      plcConnected: true,
    },
    {
      code: 'MKZ-04',
      name: 'Gắn linh kiện & Hàn tự động',
      category: 'ASSEMBLY',
      model: 'MKZ-ASM-04R',
      serial: 'FII-2024-88124',
      supplier: 'Universal Robots + FII',
      status: 'ERROR',
      oee: 62.3,
      throughput: 920,
      cycleTime: 4.1,
      totalProduced: 11870,
      errorCount: 19,
      plcConnected: false,
    },
    {
      code: 'MKZ-05',
      name: 'Kiểm tra chức năng (FCT)',
      category: 'TESTING',
      model: 'MKZ-TST-05',
      serial: 'FII-2024-88125',
      supplier: 'Keysight',
      status: 'RUNNING',
      oee: 96.1,
      throughput: 1720,
      cycleTime: 5.2,
      totalProduced: 11980,
      errorCount: 3,
      plcConnected: true,
    },
    {
      code: 'MKZ-06',
      name: 'Kiểm tra thị giác (AOI/QC)',
      category: 'QC',
      model: 'MKZ-QC-06V',
      serial: 'FII-2024-88126',
      supplier: 'Cognex',
      status: 'RUNNING',
      oee: 93.7,
      throughput: 1680,
      cycleTime: 3.8,
      totalProduced: 11720,
      errorCount: 5,
      plcConnected: true,
    },
    {
      code: 'MKZ-07',
      name: 'Dán nhãn & Đóng gói',
      category: 'PACKAGING',
      model: 'MKZ-PKG-07',
      serial: 'FII-2024-88127',
      supplier: 'FII Packaging',
      status: 'IDLE',
      oee: 79.4,
      throughput: 1450,
      cycleTime: 4.5,
      totalProduced: 10950,
      errorCount: 8,
      plcConnected: true,
    },
    {
      code: 'MKZ-08',
      name: 'Palletizing & Outfeed',
      category: 'OUTFEED',
      model: 'MKZ-OUT-08',
      serial: 'FII-2024-88128',
      supplier: 'ABB Robotics',
      status: 'MAINTENANCE',
      oee: 0,
      throughput: 0,
      cycleTime: 6.0,
      totalProduced: 10230,
      errorCount: 11,
      plcConnected: false,
    },
  ]

  const createdMachines: any[] = []
  for (const m of machinesData) {
    const machine = await prisma.machine.create({
      data: {
        ...m,
        lineId: mkzLine.id,
        installDate: new Date('2024-03-15'),
      },
    })
    createdMachines.push(machine)
  }
  console.log(`✅ Đã tạo ${createdMachines.length} máy cho dây chuyền MKZ`)

  // ========== 4. PLC CONFIG (ví dụ tag mapping cho simulation + thật) ==========
  const plcExamples = [
    { machineCode: 'MKZ-01', protocol: 'MODBUS_TCP', ip: '192.168.10.101', port: 502, tags: JSON.stringify({ start: 'coil:1001', status: 'hr:3001', count: 'hr:3005' }) },
    { machineCode: 'MKZ-02', protocol: 'MODBUS_TCP', ip: '192.168.10.102', port: 502, tags: JSON.stringify({ start: 'coil:1002', status: 'hr:3101', count: 'hr:3105' }) },
    { machineCode: 'MKZ-05', protocol: 'SIEMENS_S7', ip: '192.168.10.105', port: 102, tags: JSON.stringify({ db: 'DB25', status: 'DB25.DBW10', produced: 'DB25.DBD20' }) },
    { machineCode: 'MKZ-06', protocol: 'OPC_UA', ip: '192.168.10.106', port: 4840, tags: JSON.stringify({ nodeStatus: 'ns=2;s=Machine.Status', nodeCount: 'ns=2;s=Production.Count' }) },
  ]

  for (const p of plcExamples) {
    const machine = createdMachines.find((m: any) => m.code === p.machineCode)
    if (machine) {
      await prisma.pLCConfig.create({
        data: {
          machineId: machine.id,
          protocol: p.protocol,
          ipAddress: p.ip,
          port: p.port,
          tags: p.tags,
          connected: machine.plcConnected,
          lastSync: new Date(),
        },
      })
    }
  }
  console.log('✅ Đã tạo PLC Config mẫu cho 4 máy')

  // ========== 5. MACHINE LOGS (lịch sử hoạt động) ==========
  const shifts = ['1', '2', '3']
  const logTypes = ['STATUS', 'PRODUCTION', 'ERROR', 'PLC_SYNC']

  for (let i = 0; i < createdMachines.length; i++) {
    const m = createdMachines[i]
    // Tạo 6-8 log gần đây cho mỗi máy
    for (let j = 0; j < 7; j++) {
      const hoursAgo = j * 1.8 + (i % 3)
      const ts = new Date(Date.now() - hoursAgo * 3600 * 1000)
      const type = j % 4 === 0 ? 'ERROR' : j % 3 === 0 ? 'STATUS' : 'PRODUCTION'
      await prisma.machineLog.create({
        data: {
          machineId: m.id,
          timestamp: ts,
          type,
          shift: shifts[(j + i) % 3],
          message:
            type === 'ERROR'
              ? `Lỗi cảm biến vị trí #${(j % 4) + 1} - ${m.code}`
              : type === 'STATUS'
                ? `Chuyển trạng thái: ${m.status}`
                : `Sản xuất +${Math.floor(180 + Math.random() * 60)} units`,
          value: type === 'PRODUCTION' ? 180 + Math.random() * 80 : undefined,
        },
      })
    }
  }
  console.log('✅ Đã tạo lịch sử log cho các máy')

  // ========== 6. ALERTS (realtime alerts) ==========
  const errorMachine = createdMachines.find((m: any) => m.code === 'MKZ-04')!
  const maintMachine = createdMachines.find((m: any) => m.code === 'MKZ-08')!

  await prisma.alert.createMany({
    data: [
      {
        machineId: errorMachine.id,
        severity: 'ERROR',
        message: 'MKZ-04: Mất tín hiệu encoder trục X - Dây chuyền dừng khẩn',
        timestamp: new Date(Date.now() - 1000 * 60 * 37),
        resolved: false,
      },
      {
        machineId: maintMachine.id,
        severity: 'WARNING',
        message: 'MKZ-08: Lịch bảo trì định kỳ - Thay băng tải & kiểm tra robot',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
        resolved: false,
      },
      {
        machineId: createdMachines[3].id,
        severity: 'CRITICAL',
        message: 'Nhiệt độ động cơ servo vượt ngưỡng 78°C (ngưỡng 72°C)',
        timestamp: new Date(Date.now() - 1000 * 60 * 12),
        resolved: true,
        resolvedBy: 'KS004',
        resolvedAt: new Date(Date.now() - 1000 * 60 * 8),
      },
    ],
  })
  console.log('✅ Đã tạo 3 alerts mẫu (1 unresolved)')

  // ========== 7. TROUBLESHOOTING GUIDES ==========
  const guides = [
    {
      machineId: errorMachine.id,
      errorCode: 'ENC-042',
      title: 'Mất tín hiệu Encoder trục X',
      description: 'Lỗi thường gặp trên trạm lắp ráp khi encoder bị ngắt kết nối hoặc dây cáp hỏng.',
      steps: JSON.stringify([
        { step: 1, action: 'Kiểm tra LED trạng thái encoder (xanh = OK)', expected: 'LED sáng xanh' },
        { step: 2, action: 'Kiểm tra cáp kết nối giữa encoder và PLC (cổng X1)', expected: 'Cáp chắc chắn, không gãy' },
        { step: 3, action: 'Reset lỗi từ HMI hoặc nút Reset trên tủ điện', expected: 'Trạng thái về IDLE' },
        { step: 4, action: 'Chạy thử 5 chu kỳ không tải', expected: 'Throughput ổn định > 1600' },
      ]),
    },
    {
      machineId: createdMachines.find((m: any) => m.code === 'MKZ-05')!.id,
      errorCode: 'FCT-117',
      title: 'Test chức năng thất bại - Điện áp đầu ra thấp',
      description: 'Board không đạt thông số điện áp theo spec (11.8-12.3V).',
      steps: JSON.stringify([
        { step: 1, action: 'Kiểm tra nguồn cấp 24VDC vào module test', expected: 'Đo được 23.8 - 24.4V' },
        { step: 2, action: 'Kiểm tra connector J12 trên board (có bị lỏng không)', expected: 'Cắm chắc' },
        { step: 3, action: 'Chạy lại test với board mới (golden sample)', expected: 'Pass' },
        { step: 4, action: 'Nếu vẫn fail → chuyển board sang trạm rework', expected: 'Board được đánh dấu NG' },
      ]),
    },
    {
      machineId: null, // General guide
      errorCode: 'GEN-001',
      title: 'Mất kết nối PLC / Heartbeat timeout',
      description: 'Máy mất heartbeat từ PLC > 8 giây. Áp dụng cho hầu hết các trạm.',
      steps: JSON.stringify([
        { step: 1, action: 'Kiểm tra đèn link trên module Ethernet/Profibus', expected: 'Link sáng' },
        { step: 2, action: 'Ping IP của PLC từ HMI engineering station', expected: 'Reply < 5ms' },
        { step: 3, action: 'Kiểm tra switch công nghiệp (có port nào bị lỗi không)', expected: 'Tất cả port xanh' },
        { step: 4, action: 'Restart module communication từ tủ điện (nếu được phép Kỹ sư)', expected: 'Reconnect trong 15s' },
      ]),
    },
  ]

  for (const g of guides) {
    await prisma.troubleshootingGuide.create({ data: g })
  }
  console.log('✅ Đã tạo 3 hướng dẫn khắc phục sự cố')

  // ========== 8. SHIFT TARGET ==========
  await prisma.shiftTarget.create({
    data: {
      lineId: mkzLine.id,
      shift: '1',
      targetQty: 4200,
      date: today,
      actualQty: 3850,
    },
  })
  console.log('✅ Đã tạo target ca hiện tại')

  // ========== 9. AUDIT LOG mẫu ==========
  if (chuQuan && kySu) {
    await prisma.auditLog.createMany({
      data: [
        {
          userId: chuQuan.id,
          action: 'LOGIN',
          details: JSON.stringify({ role: 'CHU_QUAN', ip: '10.88.12.45' }),
        },
        {
          userId: kySu.id,
          action: 'PLC_WRITE',
          entity: 'Machine',
          entityId: errorMachine.id,
          details: JSON.stringify({ tag: 'coil:1004', value: 'RESET', reason: 'Khôi phục sau lỗi encoder' }),
        },
        {
          userId: kySu.id,
          action: 'UPDATE_MACHINE',
          entity: 'Machine',
          entityId: createdMachines[3].id,
          details: JSON.stringify({ field: 'status', from: 'ERROR', to: 'MAINTENANCE' }),
        },
      ],
    })
  }
  console.log('✅ Đã tạo audit log mẫu')

  console.log('\n🎉 Seed hoàn tất! Dữ liệu sẵn sàng cho FII LineGuard MKZ.')
  console.log('📋 Tài khoản demo:')
  console.log('   CQ001 / admin123  → Chủ Quản')
  console.log('   TL002 / troly123  → Trợ Lý')
  console.log('   CT003 / chuyen123 → Chuyền Trưởng')
  console.log('   KS004 / kysu123   → Kỹ Sư')
}

main()
  .catch((e) => {
    console.error('❌ Seed lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
