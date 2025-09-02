require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');


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

    // ✅ Make env variables available in your code
    new webpack.DefinePlugin({
      'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID),
      'process.env.FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID),
      'process.env.FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.FIREBASE_MEASUREMENT_ID),
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 6,
      maxAsyncRequests: 8,
      minSize: 20000,
      maxSize: 250000,
      cacheGroups: {
        firebase: {
          test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
          name: 'firebase',
          chunks: 'all',
          priority: 30,
          enforce: true
        },
        moment: {
          test: /[\\/]node_modules[\\/](moment|moment-timezone)[\\/]/,
          name: 'moment',
          chunks: 'all',
          priority: 25,
          enforce: true
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: -10,
          maxSize: 150000
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
          maxSize: 100000
        }
      }
    },
    usedExports: true,
  },
  performance: {
    maxAssetSize: 500000,
    maxEntrypointSize: 500000,
    hints: 'warning'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
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
    ]
  },
  
  watch: false
};