const isDev = process.env.NODE_ENV !== 'production'

/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js hydrates pages with inline bootstrap scripts. A nonce-based
      // policy would force every page to render dynamically, so this app keeps
      // static rendering and limits scripts to its own origin plus Analytics.
      // React's development runtime uses eval for debugging callstacks. Keep
      // the exception out of production builds.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com`,
      // Tailwind and Radix write inline style attributes (palette swatches,
      // progress transforms), which cannot carry a nonce.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://platform-lookaside.fbsbx.com https://www.google-analytics.com https://www.googletagmanager.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
      "frame-src https://maps.google.com https://www.google.com",
      "media-src 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Playwright drives the dev server over 127.0.0.1.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  experimental: {
    // Keep visited planner pages in the client router cache for 30s so
    // moving between budget, guests, tasks, etc. feels instant. Server
    // actions still call revalidatePath() and bust the affected entries.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
