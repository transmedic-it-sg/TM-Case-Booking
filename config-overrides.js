const path = require('path');
const { override, addWebpackAlias, addWebpackPlugin } = require('react-app-rewired');

module.exports = override(
  // Add webpack aliases for shorter import paths
  addWebpackAlias({
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@assets': path.resolve(__dirname, 'src/assets'),
  }),
  
  // Production optimizations
  (config) => {
    if (process.env.NODE_ENV === 'production') {
      // Enable source maps for debugging but keep them separate
      config.devtool = 'source-map';
      
      // Optimize bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor bundle for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate common components bundle
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Remove console.logs in production builds
    if (process.env.NODE_ENV === 'production') {
      config.optimization.minimizer[0].options.terserOptions.compress.drop_console = true;
    }

    return config;
  }
);