import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Hides the Next.js development indicator.
   *
   * It never appears in production, but it overlaps the interface while the
   * application is being reviewed and it is not addressed to the people using
   * DIFFUSIO — its buttons open build diagnostics.
   *
   * Build errors still surface: they appear in the page itself and in the
   * server console, which is where they belong.
   */
  devIndicators: false,

  experimental: {
    /**
     * Ceiling on the body of a Server Action.
     *
     * Next.js defaults to 1 MB, while the application offers to upload files of
     * up to 20 MB (`UPLOAD_TAILLE_MAX_OCTETS`). Above the default the request
     * was refused before reaching any of our code, so the size check never ran
     * and the user got an opaque error instead of a clear message.
     *
     * Slightly above 20 MB, to leave room for the rest of the form.
     */
    serverActions: { bodySizeLimit: '24mb' },
  },
};

export default nextConfig;
