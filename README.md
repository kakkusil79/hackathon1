# 🍡 떡주문관리

전화 주문을 받는 떡집 사장님을 위한 주문·고객 관리(CRM) 웹앱입니다. 모든 데이터는 가상입니다.

- **주문 입력** (`/`): 전화번호로 고객을 조회하고, 지난 주문을 그대로 다시 담아 저장합니다. 오늘 픽업 목록도 함께 보입니다.
- **주문 현황** (`/orders`): 리스트·칸반·캘린더 세 가지 보기를 제공하고, 상태를 바로 바꿀 수 있습니다.
- **고객** (`/customers`): 누적 주문, 마지막 주문일, 자주 주문한 상품, 고객 메모를 봅니다.
- **상품** (`/products`): 가격 수정, 판매 중지, 누적 판매량을 관리합니다.
- **대시보드** (`/dashboard`): 매출 KPI, 일별 매출, 상품별·요일별 주문, 단골 TOP 5, 7일 생산 계획을 보여 줍니다.

## 기술 스택
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma 7 (`@prisma/adapter-pg`) · Supabase Postgres · Vercel

## 로컬 실행

```bash
npm install
cp .env.example .env        # Supabase 연결 문자열 입력
npm run db:migrate -- --name init   # 테이블 생성
npm run db:seed             # 가상 데이터 (상품 11 · 고객 20 · 주문 60)
npm run dev
```

### Supabase 연결 문자열
Supabase 대시보드 상단의 **Connect** 버튼에서 복사합니다.

| 변수 | 용도 | 포트 |
|---|---|---|
| `DATABASE_URL` | 앱 런타임 (Transaction pooler, 끝에 `?pgbouncer=true`) | 6543 |
| `DIRECT_URL` | 마이그레이션·시드 (Direct 또는 Session pooler) | 5432 |

## Vercel 배포
1. GitHub에 push한 뒤 Vercel에서 **Import Project**를 누릅니다.
2. Environment Variables에 `DATABASE_URL`과 `DIRECT_URL`을 등록합니다.
3. 배포합니다. `build` 스크립트가 `prisma generate`를 먼저 실행합니다.
4. 스키마가 바뀌면 로컬에서 `npm run db:migrate`를 실행하거나, 운영 DB에 `npm run db:deploy`를 실행합니다.
