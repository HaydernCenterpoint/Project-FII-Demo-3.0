// lib/auth.ts
// Xác thực & Phân quyền (RBAC) cho FII LineGuard
// Sử dụng JWT (jose) + httpOnly cookie. Phù hợp demo + production-ready pattern.

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fii-lineguard-demo-secret-change-in-prod-2026'
)

export type Role = 'CHU_QUAN' | 'TRO_LY' | 'CHUYEN_TRUONG' | 'KY_SU'

export interface AuthUser {
  id: string
  employeeCode: string
  name: string
  role: Role
}

export interface JWTPayload extends AuthUser {
  iat: number
  exp: number
}

// Tạo JWT (15 ngày cho demo)
export async function createJWT(user: AuthUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15d')
    .sign(JWT_SECRET)
}

// Giải mã & xác thực JWT từ cookie
export async function verifyJWT(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.id as string,
      employeeCode: payload.employeeCode as string,
      name: payload.name as string,
      role: payload.role as Role,
    }
  } catch {
    return null
  }
}

// Lấy user hiện tại từ cookie (dùng trong Server Components / Actions)
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('fii_session')?.value
  if (!token) return null
  return verifyJWT(token)
}

// Yêu cầu đăng nhập (dùng trong Server Actions / Route)
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?error=unauthorized')
  }
  return user
}

// Kiểm tra quyền theo role (RBAC)
export function hasPermission(
  userRole: Role,
  requiredRoles: Role[]
): boolean {
  return requiredRoles.includes(userRole)
}

// Các quyền đặc biệt
export const PERMISSIONS = {
  // Chỉ Kỹ sư + Chủ Quản được ghi PLC / thay đổi cấu hình nhạy cảm
  canWritePLC: (role: Role) => ['CHU_QUAN', 'KY_SU'].includes(role),
  // Chỉ Chủ Quản + Trợ Lý + Chuyền Trưởng được approve một số hành động
  canApprove: (role: Role) => ['CHU_QUAN', 'TRO_LY', 'CHUYEN_TRUONG'].includes(role),
  // Tất cả đều xem được
  canView: () => true,
}

// Đăng xuất - xóa cookie
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('fii_session')
  redirect('/')
}
