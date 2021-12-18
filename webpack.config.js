const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');

const BUILD_DIR = path.resolve(__dirname, 'dist');
const SRC_DIR = path.resolve(__dirname, 'src');

module.exports = {
  entry: {
    'background': './src/core/background.ts'
  },
  output: {
    filename: '[name].js',
    path: BUILD_DIR,
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
              source: path.join(SRC_DIR, 'popup/popup.html'),
              destination: path.join(BUILD_DIR, './'),
            },
            {
              source: path.join(SRC_DIR, 'popup/popup.js'),
              destination: path.join(BUILD_DIR, './'),
            },
            {
              source: path.join(SRC_DIR, 'manifest.json'),
              destination: path.join(BUILD_DIR, './'),
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