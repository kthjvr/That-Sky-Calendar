const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
  mode: 'production',
  entry: {
    index: './src/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      chunks: ['index']
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 4,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  rules: [
    {
      test: /\.(png|jpe?g|gif|svg)$/i,
      use: [
        'file-loader',
        {
          loader: 'image-webpack-loader',
          options: {
            mozjpeg: { progressive: true },
            optipng: { enabled: false },
            pngquant: { quality: [0.65, 0.90], speed: 4 },
            gifsicle: { interlaced: false }
          }
        }
      ]
    },
    {
      test: /\.(mp4|webm)$/i,
      use: [
        'file-loader',
        {
          loader: 'video-webpack-loader',
          options: {
            quality: 'high',
            format: 'mp4',
            codecs: {
              video: 'h264',
              audio: 'aac'
            },
          }
        }
      ]
    }
  ],
  watch: false
};