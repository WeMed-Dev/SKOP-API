const path = require('path');
const loader = require("ts-loader");

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'SkopAPI.js',
        path: path.resolve(__dirname, 'dist'),
        //path: path.resolve(__dirname, 'demo'),
        library: {
            type: "umd",
            name: "SkopAPI"
        },
        globalObject: "this",
    },
    mode: 'production',
    //devtool: "inline-source-map",
    target: "web",
    resolve: {
        extensions: ['.ts','.js'],
        alias: {
            core: path.join(__dirname, 'core'),
        },
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