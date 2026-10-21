// 가상 데이터 시드: 실제 고객·연락처가 아닙니다.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderStatus } from "../src/generated/prisma/enums";
import { addDaysKey, fromKst, kstDateKey } from "../src/lib/format";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

// 매번 같은 결과가 나오도록 고정 시드 난수
let state = 20261021;
function rand() {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const PRODUCTS = [
  { name: "인절미", category: "일반떡", unit: "되", price: 30000 },
  { name: "백설기", category: "일반떡", unit: "되", price: 28000 },
  { name: "꿀떡", category: "일반떡", unit: "kg", price: 18000 },
  { name: "바람떡", category: "일반떡", unit: "kg", price: 18000 },
  { name: "가래떡", category: "일반떡", unit: "kg", price: 12000 },
  { name: "약식", category: "일반떡", unit: "판", price: 25000 },
  { name: "경단", category: "일반떡", unit: "팩", price: 8000 },
  { name: "송편", category: "명절·제사떡", unit: "kg", price: 22000 },
  { name: "시루떡", category: "명절·제사떡", unit: "되", price: 32000 },
  { name: "무지개떡", category: "돌·백일떡", unit: "되", price: 35000 },
  { name: "답례떡 세트", category: "답례떡", unit: "개", price: 3500 },
];

const NAMES = [
  "김떡순", "이인절", "박백설", "최송편", "정꿀떡", "강약식", "조경단", "윤가래",
  "장시루", "임무지", "한바람", "오찹쌀", "서콩고", "신팥죽", "권절편", "황증편",
  "안개피", "송수수", "류호박", "홍쑥떡",
];
const MEMOS = ["단골, 현금 결제 선호", "팥 알레르기", "매달 첫째 주 제사떡", "회사 행사 담당자", null, null, null];
const ORDER_MEMOS = ["포장 개별로 부탁", "스티커 부착", "오전 일찍 픽업", "계좌이체 완료", "떡 덜 달게", null, null, null, null];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  const products = await Promise.all(PRODUCTS.map((data) => prisma.product.create({ data })));
  const giftSet = products.find((p) => p.name === "답례떡 세트")!;
  const regular = products.filter((p) => p.id !== giftSet.id);

  const today = kstDateKey(new Date());
  const customers = await Promise.all(
    NAMES.map((name, i) =>
      prisma.customer.create({
        data: {
          name,
          phone: `010-0000-${String(i + 1).padStart(4, "0")}`,
          memo: pick(MEMOS),
          // 뒤쪽 4명은 최근 2주 안에 처음 온 신규 고객
          createdAt: fromKst(addDaysKey(today, i >= 16 ? -between(1, 14) : -between(40, 120)), "09:00"),
        },
      }),
    ),
  );

  // 앞쪽 고객일수록 자주 주문하는 단골이 되도록 가중치를 준다
  const weighted = customers.flatMap((c, i) => Array<typeof c>(i < 5 ? 5 : i < 12 ? 2 : 1).fill(c));

  for (let n = 0; n < 60; n++) {
    const offset = between(-30, 14);
    const dateKey = addDaysKey(today, offset);
    const time = `${String(between(8, 17)).padStart(2, "0")}:${pick(["00", "30"])}`;
    const pickupAt = fromKst(dateKey, time);
    const customer = pick(weighted);

    const items =
      rand() < 0.15
        ? [{ product: giftSet, quantity: between(2, 10) * 10 }]
        : [...new Set(Array.from({ length: between(1, 3) }, () => pick(regular)))].map((product) => ({
            product,
            quantity: between(1, 4),
          }));

    let status: OrderStatus;
    if (offset < 0) status = rand() < 0.06 ? "CANCELED" : "COMPLETED";
    else if (offset === 0) status = pick(["RECEIVED", "IN_PROGRESS", "READY", "COMPLETED"]);
    else if (offset === 1) status = pick(["RECEIVED", "IN_PROGRESS"]);
    else status = "RECEIVED";

    const delivery = rand() < 0.2;
    await prisma.order.create({
      data: {
        customerId: customer.id,
        pickupAt,
        pickupType: delivery ? "DELIVERY" : "PICKUP",
        address: delivery ? `가상시 떡볶구 인절미로 ${between(1, 99)}` : null,
        status,
        memo: pick(ORDER_MEMOS),
        totalPrice: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
        createdAt: new Date(pickupAt.getTime() - between(1, 5) * 86400000),
        items: {
          create: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.product.price })),
        },
      },
    });
  }

  console.log(`✔ 상품 ${products.length}개, 고객 ${customers.length}명, 주문 60건 생성`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
