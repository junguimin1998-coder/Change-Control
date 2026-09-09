import { prisma } from "@/lib/prisma";
import { kstDateStamp } from "@/lib/kst";

// CC-MD-YYMMDD-NNN 형식으로 채번합니다. 같은 날짜(KST 기준) 안에서는 001, 002...로
// 올라가고, 날짜가 바뀌면 다시 001부터 시작합니다.
export async function generateCcNumber(): Promise<string> {
  const dateStamp = kstDateStamp();
  const prefix = `CC-MD-${dateStamp}-`;
  const count = await prisma.changeControl.count({
    where: { ccNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}${seq}`;
}
