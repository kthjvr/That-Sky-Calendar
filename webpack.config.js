// Run the webpack and it will take the source file and any imports from the file and bundle them all together 
// and display it out in the dist folder under the file called bunle.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { watch } = require('fs');

module.exports = {
  mode: 'development', 
  entry: './src/index.js', 
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js', 
  },

  // watch: true
};