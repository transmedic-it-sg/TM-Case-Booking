/**
 * Create React App Configuration Override
 * Memory-friendly configuration for both development and production
 */

const path = require('path');

module.exports = function override(config, env) {
  // Add path aliases (safe for both dev and prod)
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@assets': path.resolve(__dirname, 'src/assets'),
  };

  // Production-only optimizations
  if (env === 'production') {
    // Simple production optimizations
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };
    
    // Remove source maps in production
    config.devtool = false;
  }

  // Increase memory limit for TypeScript checker
  const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
  config.plugins = config.plugins.map(plugin => {
    if (plugin instanceof ForkTsCheckerWebpackPlugin) {
      return new ForkTsCheckerWebpackPlugin({
        ...plugin.options,
        typescript: {
          ...plugin.options.typescript,
          memoryLimit: 8192, // 8GB memory limit
        },
      });
    }
    return plugin;
  });

  return config;
};