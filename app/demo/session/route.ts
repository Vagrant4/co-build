import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/src/lib/authorization";
import { isDemoMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";

export async function GET(request: Request) {
  if (!isDemoMode()) return Response.json({ error: "Demo switching is disabled." }, { status: 404 });
  const url = new URL(request.url);
  const userId = url.searchParams.get("user");
  const nextValue = url.searchParams.get("next") ?? "/";
  const destination = nextValue.startsWith("/") && !nextValue.startsWith("//") ? nextValue : "/";
  if (!userId) return Response.json({ error: "Demo account is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) return Response.json({ error: "Demo account not found." }, { status: 404 });

  const roleDestination = user.role === "HOST" ? "/dashboard/host" : user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/user";
  const response = NextResponse.redirect(new URL(destination === "/" ? roleDestination : destination, url));
  response.cookies.set(DEMO_SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
