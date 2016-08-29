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
const bundleFilePath = basePath + '/bundle.js'
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

function tokenize(code) {
    return code
}

function writePlaygroundCodeToFile(code) {
    const tokenizedCode = tokenize(code)

const indexFileContent = `import React from 'react'
import Comp from './code.js'

var App = React.createClass({
    render() {
        return (
            <div>
                ${code}
            </div>
        )
    }
})

module.exports = App
`
    return writeFile(indexFilePath, indexFileContent)
}

let pendingPromise = null

function compile(code, playgroundCode, openFilePath) {
    pendingPromise = Promise.pending()
    return writeCodeToFile(code)
        .then(() => writePlaygroundCodeToFile(playgroundCode))
        .then(() => pendingPromise.promise)


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
    webpackCompiler.watch({ // watch options:
        aggregateTimeout: 300, // wait so long for more changes
        poll: true // use polling instead of native watchers
        // pass a number to set the polling interval
    }, (err, stats) => {
        console.log('got here?')
        if(!pendingPromise) {
            return
        }

        if(err) {
            console.log('webpack error compiling code', err.toString())
            pendingPromise.reject(err.toString())
        } else {
            const bundle = fs.readFileSync(bundleFilePath).toString()
            eval(bundle)
            const App = module.exports
            pendingPromise.resolve(<div><App /></div>)
        }
    })

    return {
        compile,
        cleanUp,
        onNewFileLoad,
        formatCode,
        generateTests,
    }
}
