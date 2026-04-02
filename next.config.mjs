/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    /** Vermijd webpack-bundling van pdfjs/canvas/tesseract (runtime errors in RSC/route bundles). */
    serverComponentsExternalPackages: [
      'tesseract.js',
      'pdf-parse',
      'pdfjs-dist',
      '@napi-rs/canvas',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
}

export default nextConfig
