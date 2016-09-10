// import webpack from 'webpack'
var path = require('path')
var loaders = require('./webpack.loaders.js')
var FlowStatusWebpackPlugin = require('flow-status-webpack-plugin');

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

// TODO - should be dynamic
var baseSrcPath = process.env.HOME + '/Documents/main_service/frontend/harmony'

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
		root: [path.resolve(baseSrcPath + '/src'), path.resolve(__dirname)],
		extensions: ['', '.js', '.jsx', '.less', '.css', '.sass', '.json'],
		modulesDirectories: [
			'',
			'node_modules',
			'bower_components',
			'pp/modules/root/less',
			'pp/core/less',
		],
	},
	module: {
		preLoaders: [
            {
                test: /\.less$/,
                loader: path.resolve(__dirname + '/loaders/addtilde')
            }
        ],
		loaders
	},
	externals: {
        'webpack': 'webpack',
        'react': 'react',
        "react-dom": "react-dom"
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
	plugins: [
		new FlowStatusWebpackPlugin()
		// new webpack.NoErrorsPlugin(),
		// new webpack.HotModuleReplacementPlugin(),
		// new HtmlWebpackPlugin({
		// 	template: './src/template.html'
		// })
	]
}
