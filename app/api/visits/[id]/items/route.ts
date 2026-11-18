import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, userForToken } from "@/lib/auth";
import { validateItems } from "@/lib/items";
import { replaceItems } from "@/lib/visits";

// PUT /api/visits/:id/items — replaces the visit's item list with the submitted one.
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/visits/[id]/items">) {
  const user = userForToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const result = validateItems(body?.items);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  const submittedAt = replaceItems(user.id, Number(id), result.items);
  if (!submittedAt) return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  return NextResponse.json({ submittedAt });
}
