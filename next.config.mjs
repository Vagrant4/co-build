import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve()
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;
