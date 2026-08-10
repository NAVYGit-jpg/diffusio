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
};

export default nextConfig;
