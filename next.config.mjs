import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint runs separately; don't block production builds on lint warnings.
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
