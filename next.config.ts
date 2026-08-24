import type { NextConfig } from "next";

/**
 * Security headers, applied to every response.
 *
 * These are the cheap, high-value ones for a public site. They are set here
 * rather than in middleware because this app has no middleware/proxy layer —
 * every route is a Server Component or Server Action.
 */
const securityHeaders = [
  // Don't let browsers guess a response's type; stops a user-uploaded file being
  // sniffed as executable HTML/JS.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block framing entirely: nothing here is meant to be embedded, and this is
  // the clickjacking defence for the owner dashboard's action buttons.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin but not the path when navigating away, so a storefront URL
  // never leaks a dashboard path to a third party.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // We ask for none of these; deny them up front.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HSTS: once seen over HTTPS, never fall back to HTTP for this host.
  // Ignored on plain-HTTP localhost, so it's safe to set unconditionally.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
