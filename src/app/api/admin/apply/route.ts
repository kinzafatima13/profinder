import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/apply-admin";

export async function GET(req: NextRequest) {
  const founder = await requireFounder();
  if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const status = req.nextUrl.searchParams.get("status")?.trim() || "";
  const payment = req.nextUrl.searchParams.get("payment")?.trim() || "";
  const sort = req.nextUrl.searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const take = 20;
  const where = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(q
      ? {
          student: {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          },
        }
      : {}),
  };
  const [total, requests, counts] = await Promise.all([
    prisma.applyRequest.count({ where }),
    prisma.applyRequest.findMany({
      where,
      orderBy: { createdAt: sort },
      skip: (page - 1) * take,
      take,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        feeCents: true,
        package: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { name: true, email: true } },
        _count: { select: { items: true, documents: true } },
      },
    }),
    prisma.applyRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return NextResponse.json({ requests, total, page, pageSize: take, counts });
}
