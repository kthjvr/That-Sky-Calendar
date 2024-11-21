const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development', 
  entry: {
    index: './src/index.js', 
    event: './src/event.js', 
    spirit: './src/spirits.js'
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
    new HtmlWebpackPlugin({
      filename: 'event.html', 
      template: './src/event.html', 
      chunks: ['event']
    }),
    new HtmlWebpackPlugin({
      filename: 'spirit.html', 
      template: './src/spirits.html', 
      chunks: ['spirit']
    })
  ],
  watch: false
};