import { NextResponse, type NextRequest } from "next/server";

// Quick check only: no session cookie -> sign-in page. Pages and the API still
// verify the session against the database (lib/auth.ts).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("pablo_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/|_next/|sw\\.js|manifest\\.webmanifest|icon|apple-icon|favicon\\.ico).*)",
  ],
};
