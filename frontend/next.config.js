/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Generates a static 'out' folder during build
  images: {
    unoptimized: true, // Required for static export
  },
};

module.exports = nextConfig;
