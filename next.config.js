/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // tighten to your storage bucket's host in production
    ],
  },
};

module.exports = nextConfig;
