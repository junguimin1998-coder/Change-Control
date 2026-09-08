import { prisma } from "@/lib/prisma";

// 원본 양식의 번호 체계(CC-MD-000000-00)를 따라 연도 + 순번으로 생성합니다.
export async function generateCcNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.changeControl.count({
    where: { ccNumber: { startsWith: `CC-MD-${year}` } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `CC-MD-${year}-${seq}`;
}
