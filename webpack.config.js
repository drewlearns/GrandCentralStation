const path = require("path");
const nodeExternals = require("webpack-node-externals");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
  return {
    mode: "production",
    entry: path.resolve(__dirname, "src", env.entry),
    target: "node",
    output: {
      path: path.resolve(__dirname, "deploy"),
      filename: `${path.basename(env.entry, ".js")}.js`,
      libraryTarget: "commonjs2",
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [{ from: "prisma/schema.prisma", to: "schema.prisma" }],
      }),
    ],
    optimization: {
      minimize: true,
    },
    externals: [nodeExternals()], // Exclude all node_modules
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};
