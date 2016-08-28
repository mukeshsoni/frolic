// import webpack from 'webpack'
import path from 'path'
import loaders from './webpack.loaders.js'

// global css
loaders.push({
	test: /[\/\\](node_modules|global)[\/\\].*\.css$/,
	loaders: [
		'style?sourceMap',
		'css'
	]
})
// local css modules
loaders.push({
	test: /[\/\\]src[\/\\].*\.css$/,
	loaders: [
		'style?sourceMap',
		'css?modules&importLoaders=1&localIdentName=[path]___[name]__[local]___[hash:base64:5]'
	]
})

module.exports = {
	entry: [
		path.resolve(__dirname + `/index.js`) // Your appʼs entry point
	],
	output: {
		path: path.resolve(__dirname),
		filename: 'bundle.js',
		libraryTarget: "commonjs2"
	},
	resolve: {
		extensions: ['', '.js', '.jsx']
	},
	module: {
		loaders
	},
	// devServer: {
	// 	contentBase: "./public",
	// 	// do not print bundle build stats
	// 	noInfo: true,
	// 	// enable HMR
	// 	hot: true,
	// 	// embed the webpack-dev-server runtime into the bundle
	// 	inline: true,
	// 	// serve index.html in place of 404 responses to allow HTML5 history
	// 	historyApiFallback: true,
	// 	port: PORT,
	// 	host: HOST
	// },
	// plugins: [
		// new webpack.NoErrorsPlugin(),
		// new webpack.HotModuleReplacementPlugin(),
		// new HtmlWebpackPlugin({
		// 	template: './src/template.html'
		// })
	// ]
}
