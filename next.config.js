/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
      // Add any other domains you might be using for images
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      }
    ],
  },
  // Other Next.js config options
}

module.exports = nextConfig
