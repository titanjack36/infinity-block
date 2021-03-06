const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');
require('dotenv').config();

const isDevEnv = process.env.ENVIRONMENT === 'dev';

const devOptions = {
  optimization: {
    minimize: false
  },
  devtool : 'source-map'
};
const prodOptions = {};

const BUILD_DIR = path.resolve(__dirname, 'dist');
const SRC_DIR = path.resolve(__dirname, 'src');

const copyFiles = [
  'popup/popup.html',
  'popup/popup.css',
  'styles.css',
  'manifest.json'
];

module.exports = {
  entry: {
    'background': path.join(SRC_DIR, 'core/background.ts'),
    'popup': path.join(SRC_DIR, 'popup/popup.ts')
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
          copy: copyFiles.map(filePath => ({
            source: path.join(SRC_DIR, filePath),
            destination: path.join(BUILD_DIR, './'),
          }))
        }
      }
    })
  ],
  mode: (isDevEnv ? 'development' : 'production'),
  ...(isDevEnv ? devOptions : prodOptions),
  watchOptions: {
    ignored: /node_modules/,
  }
}
