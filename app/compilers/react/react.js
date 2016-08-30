import React from 'react'
import Promise from 'bluebird'
import path from 'path'

// acorn jsx parse
var acorn = require('acorn-jsx')
var escodegen = require('escodegen')
var astring = require('astring')

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

// mfs.mkdirpSync(basePath)
// try {
//     mfs.writeFileSync(indexFilePath, indexFileContent)
// } catch(e) {
//     console.log('error writing file', e.toString())
// }
import webpackConfig from './webpack.config.js'


let webpackCompiler = webpack(webpackConfig)
// webpackCompiler.inputFileSystem = mfs
// webpackCompiler.outputFileSystem = mfs

function writeCodeToFile(code) {
    return writeFile(codeFilePath, code)
}

function tokenize(code) {
    try {
        var ast = acorn.parse(code, {plugins: {jsx: true}})
        console.log('generated code: ', astring(ast.body[0], {}))
        console.log('ast:', ast)
    } catch(e) {
        console.log('error parsing code', e.toString())
    }

    return code
}

function writePlaygroundCodeToFile(code) {
    const tokenizedCode = tokenize(code)
code = '{1+10}'
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
        if(!pendingPromise) {
            return
        }

        if(err) {
            console.log('webpack error compiling code', err.toString())
            pendingPromise.reject(err.toString())
        } else {
            const bundle = fs.readFileSync(bundleFilePath).toString()
            try {
                eval(bundle)
            } catch(e) {
                console.log('error evaluating bundle', e.toString())
            }
            let App = null
            try {
                App = React.createElement(module.exports)
            } catch(e) {
                App = null
            }

            if(App) {
                pendingPromise.resolve(App)
            } else {
                pendingPromise.resolve(<div>Error: {e.toString()}</div>)
            }
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
