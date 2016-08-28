import React from 'react'
import Promise from 'bluebird'
// import webpack from 'webpack'
import MemoryFileSystem from 'memory-fs'
var mfs = new MemoryFileSystem()

import webpackConfig from './webpack.config.js'


let webpackCompiler = webpack(webpackConfig)
console.log('webpackCompiler', webpackCompiler)
webpackCompiler.outputFileSystem = mfs

function compile(code, playgroundCode, openFilePath) {
    console.log('wohoo')
    webpackCompiler.run((err, stats) => {
        console.log('webpack stats', stats.toString())
    })

    return new Promise.resolve(<div>hey from react</div>)
}

function cleanUp() {

}

function onNewFileLoad() {

}

function formatCode(code) {
    return code
}

function generateTests() {
    return ''
}

export function compiler() {
    return {
        compile,
        cleanUp,
        onNewFileLoad,
        formatCode,
        generateTests,
    }
}
