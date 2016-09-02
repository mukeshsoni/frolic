import webpack from 'webpack'
import path from 'path';

export default {
node: {
  __filename: true,
  __dirname: true
},
  module: {
    loaders: [{
      test: /\.jsx?$/,
      loaders: ['babel-loader'],
      exclude: /node_modules/
    }, {
      test: /\.json$/,
      loader: 'json-loader'
    }]
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2'
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.json'],
    packageMains: ['webpack', 'browser', 'web', 'browserify', ['jam', 'main'], 'main']
  },
  plugins: [
      new webpack.ProvidePlugin({
            webpack: 'webpack',
        })
  ],
  externals: {
      'webpack': 'webpack',
      'react': 'react',
      'react-dom': 'react-dom',
      'react-addons-test-utils': 'react-addons-test-utils'
  },
};
