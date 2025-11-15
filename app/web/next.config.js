/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Fix for @polkadot/api
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Exclude @polkadot/extension-dapp from server-side bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@polkadot/extension-dapp': 'commonjs @polkadot/extension-dapp',
      });
    }

    return config;
  },
};

module.exports = nextConfig;

