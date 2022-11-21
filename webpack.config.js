const path = require('path');
const loader = require("ts-loader");

module.exports = {
  entry: './src/index.ts',
    output: {
        filename: 'SkopAPI.js',
        path: path.resolve(__dirname, 'dist'),
        path: path.resolve(__dirname, 'demo'),
        library: {
            name: 'SkopAPI',
            type: 'commonjs-static'
        }
    },
  mode: 'development',
  //devtool: "inline-source-map",
  target: "web",
    resolve: {
    extensions: ['.ts','.js'],
  },
    module: {
        rules: [{
          test: /\.ts$/,
          use: [
              'ts-loader',
              ]
        }],
    },

};