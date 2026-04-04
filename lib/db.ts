import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '@/app/generated/prisma/client'

// Use DATABASE_URL from env
const dbUrl = process.env.DATABASE_URL ?? `file:${process.cwd()}/prisma/dev.db`

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaLibSql({ url: dbUrl }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
