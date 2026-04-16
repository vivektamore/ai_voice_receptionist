import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { key } = await req.json();
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return NextResponse.json({ error: "Admin API key not configured on server" }, { status: 500 });
  }

  if (key !== adminKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Set an httpOnly cookie that expires in 8 hours
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", adminKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_session");
  return res;
}
