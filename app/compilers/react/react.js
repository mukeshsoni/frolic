import React from 'react'
import Promise from 'bluebird'
import path from 'path'
var fs = require('fs')
var jsonfile = require('jsonfile')
var writeJsonFile = Promise.promisify(jsonfile.writeFile)

var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)

var mkdirp = Promise.promisify(require('mkdirp'));

// import webpack from 'webpack'
// import MemoryFileSystem from 'memory-fs'
// var mfs = new MemoryFileSystem()

const indexFileContent = `import React from 'react'
const a = 10
module.exports = a
`

const basePath = path.resolve(__dirname)
const indexFilePath = basePath + '/index.js'
const codeFilePath = basePath + '/code.js'
// const playgroundFilePath = basePath + '/playground.js'

console.log(indexFilePath)
// mfs.mkdirpSync(basePath)
// try {
//     mfs.writeFileSync(indexFilePath, indexFileContent)
// } catch(e) {
//     console.log('error writing file', e.toString())
// }
import webpackConfig from './webpack.config.js'


let webpackCompiler = webpack(webpackConfig)
console.log('webpackCompiler', webpackCompiler)
// webpackCompiler.inputFileSystem = mfs
// webpackCompiler.outputFileSystem = mfs

function writeCodeToFile(code) {
    return writeFile(codeFilePath, code)
}

function writePlaygroundCodeToFile(code) {
const indexFileContent = `import React from 'react'
import Code from './code.js'

var App = React.createClass({
    render() {
        return (
            <div>
                the output should come here
                ${code}
            </div>
        )
    }
})

module.exports = App
`
    return writeFile(indexFilePath, indexFileContent)
}

function compile(code, playgroundCode, openFilePath) {
    return new Promise((resolve, reject) => {
        writeCodeToFile(code)
        .then(() => writePlaygroundCodeToFile(playgroundCode))
        .then(() => {
            webpackCompiler.run((err, stats) => {
                if(err) {
                    console.log('webpack error compiling code', err.toString())
                    reject(err.toString())
                } else {
                    console.log('webpack stats', stats.toString())
                    let bundle = fs.readFileSync(path.resolve(__dirname+'/bundle.js')).toString()
                    console.log('bundle', bundle)
                    eval(bundle)
                    console.log('default module', module.exports)
                    resolve(<div>wassup{module.exports}</div>)
                }
            })
        })
    })

    // return new Promise.resolve(<div>hey from react</div>)
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
