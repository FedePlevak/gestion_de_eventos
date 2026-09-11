/** @type {import('next').NextConfig} */
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
