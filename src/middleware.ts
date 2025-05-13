// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// List of protected routes that require authentication
const protectedRoutes = [
  "@/app/home-page", // Assuming your page is part of a dashboard
  "@/app/howto-page", // Or whatever route this page is on
];

export function middleware(request: NextRequest) {
  // 1. Check if the current route is protected
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 2. Get authentication status from cookies
  const authToken = request.cookies.get("authToken")?.value;
  const isAuthenticated = !!authToken;

  // 3. Handle authentication for protected routes
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      const loginUrl = new URL("@/app/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Add security headers for authenticated routes
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    return response;
  }

  // 4. Handle API routes (if you have any)
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();

    // Set CORS headers for API routes
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    return response;
  }

  // 5. Continue with the request for non-protected routes
  return NextResponse.next();
}

// Config to specify which paths middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|login|public).*)",
  ],
};
