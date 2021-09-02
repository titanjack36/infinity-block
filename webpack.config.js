const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');

const appName = "infinity-block";

module.exports = {
  entry: {
    'background': './src/core/background.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts']
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader'
      },
    ]
  },
  plugins: [
    new FileManagerPlugin({
      events: {
        onEnd: {
          copy: [
            {
              source: './src/popup/popup.html',
              destination: './dist/',
            },
            {
              source: './src/popup/popup.js',
              destination: './dist/',
            },
            {
              source: './manifest.json',
              destination: './dist/',
            }
          ]
        }
      }
    })
  ],
  mode: 'development',
  optimization: {
    minimize: false
  },
  devtool : 'source-map',
  watchOptions: {
    ignored: /node_modules/,
  }
}