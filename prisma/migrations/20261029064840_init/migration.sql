-- CreateEnum
CREATE TYPE "ScanKind" AS ENUM ('MESSAGE', 'QR');

-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('SMS', 'KAKAO', 'OTHER', 'QR');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'CAUTION', 'DANGER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "ScanKind" NOT NULL,
    "source" "ScanSource" NOT NULL,
    "content" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "reasons" TEXT[],
    "aiSummary" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "userVerdict" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT,
    "isGuardian" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "scan_records_userId_kind_createdAt_idx" ON "scan_records"("userId", "kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "scan_records_userId_createdAt_idx" ON "scan_records"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "contacts_userId_name_idx" ON "contacts"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId_phone_key" ON "contacts"("userId", "phone");

-- AddForeignKey
ALTER TABLE "scan_records" ADD CONSTRAINT "scan_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 보안: Supabase는 public 스키마의 표를 브라우저용 Data API(공개 키)로 열어 둔다.
-- 이 앱은 서버(Prisma)로만 DB에 접근하므로, 정책 없이 RLS를 켜서 공개 키로 표를 읽고 쓰지 못하게 막는다.
-- (Prisma가 쓰는 postgres 계정은 표 주인이라 RLS의 영향을 받지 않는다.)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scan_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
-- 마이그레이션 기록표는 검증용 임시 DB에는 없을 수 있어 있을 때만 막는다.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
