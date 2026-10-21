import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

/** 주문·고객·상품은 모든 화면에 걸쳐 있으므로 변경 시 전체를 새로 그린다 */
export function revalidateAll() {
  revalidatePath("/", "layout");
}
