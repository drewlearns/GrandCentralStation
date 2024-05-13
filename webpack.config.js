const path = require('path');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
  return {
    mode: 'production',
    entry: path.resolve(__dirname, 'src', env.entry),
    target: 'node',
    // Exclude all modules in node_modules except 'uuid'
    externals: [nodeExternals({
      allowlist: ['uuid'] // This includes 'uuid' in the bundle
    })],
    output: {
      path: path.resolve(__dirname, 'deploy'),
      filename: `${path.basename(env.entry, '.js')}.js`, // Ensure filename matches the basename of the entry file
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'prisma/schema.prisma', to: 'schema.prisma' }, // Ensure schema.prisma is copied to deploy directory
          // You can add more patterns here if there are other static files to be included
        ]
      })
    ],
    optimization: {
      minimize: true
    },
    node: {
      __dirname: false,
      __filename: false
    }
  };
};
