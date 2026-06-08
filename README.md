# FII LineGuard

**Hệ thống Quản lý & Giám sát Dây chuyền Sản xuất Thông minh – Foxconn Industrial Internet**

Dự án Next.js 15 (App Router) + TypeScript cho dây chuyền sản xuất MKZ (MCKENZIE AUTO LINE).

## 🚀 Chạy dự án (Giai đoạn 1 đã hoàn tất)

### 1. Cài đặt & Khởi tạo database
```bash
npm install
npm run db:push          # Tạo SQLite dev.db từ schema
npm run seed             # Seed 4 user demo + dây chuyền MKZ 8 máy + log, alert, PLC config...
```

### 2. Chạy development server
```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

### Tài khoản Demo (4 vai trò RBAC)

| Mã NV   | Mật khẩu    | Vai trò          | Quyền nổi bật                     |
|---------|-------------|------------------|-----------------------------------|
| `CQ001` | `admin123`  | **Chủ Quản**     | Toàn quyền                        |
| `TL002` | `troly123`  | **Trợ Lý**       | Hỗ trợ vận hành                   |
| `CT003` | `chuyen123` | **Chuyền Trưởng**| Quản lý ca, approve               |
| `KS004` | `kysu123`   | **Kỹ Sư**        | Ghi PLC, cấu hình, khắc phục lỗi  |

**Đăng nhập bằng Mã nhân viên** (không phải email).

## Cấu trúc hiện tại (Giai đoạn 1)

- Landing page chuyên nghiệp + Logo FII SVG + Form đăng nhập JWT
- Auth: JWT (jose) + httpOnly cookie + RBAC + middleware bảo vệ
- Prisma + SQLite (dev.db) với đầy đủ models (User, Line, Machine, Alert, PLCConfig, Guide, AuditLog...)
- Seed data phong phú cho MKZ (replicate 2 station từ ảnh + mở rộng 8 trạm)
- Dashboard tổng quan + Link vào dây chuyền (stub)
- Simulation mode & PLC simulation sẽ được xây dựng chi tiết ở giai đoạn 3-4

## Scripts hữu ích

```bash
npm run dev          # Development
npm run build        # Production build
npm run db:push      # Đồng bộ schema → SQLite
npm run seed         # Reset + seed lại dữ liệu demo
npm run studio       # Mở Prisma Studio xem database
```

## Công nghệ (đúng theo yêu cầu)

Next.js 15 + TypeScript • Tailwind + FII branding (#003087, #E30613) • @xyflow/react (sẽ dùng) • Recharts • Prisma + SQLite • react-hook-form + zod • sonner • jspdf + xlsx • framer-motion • lucide-react • Zustand

## Tiếp theo (theo quy trình đã thống nhất)

1. ✅ Khởi tạo project + cấu trúc + seed + Landing + Auth (RBAC)
2. ⏳ Dashboard Tổng quan (realtime KPI + simulation)
3. ⏳ Trang Dây chuyền MKZ + Sơ đồ React Flow đầy đủ (ưu tiên)
4. Chi tiết Máy + Kết nối PLC simulation
5. Thống kê + Export PDF/Excel
6. Hoàn thiện phân quyền + tính năng nâng cao + Docker + README chi tiết

---

**Foxconn Industrial Internet** — Phát triển nội bộ cho nhà máy thông minh.
