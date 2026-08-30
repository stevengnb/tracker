import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Everything runs through src/proxy.ts (Next 16's renamed middleware),
    // which buffers the request body with a 10 MB default cap. Uploads are
    // limited to 100 MB in src/lib/uploads.ts, so this must sit above that
    // (plus multipart overhead) or large uploads fail with
    // "Failed to parse body as FormData". Keep this > MAX_UPLOAD_BYTES.
    proxyClientMaxBodySize: 110 * 1024 * 1024,
  },
};

export default nextConfig;
