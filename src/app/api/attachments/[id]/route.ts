import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Content-Length": String(attachment.size),
      "Cache-Control": "private, no-store",
    },
  });
}
