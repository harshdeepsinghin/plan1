/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
    ],
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
