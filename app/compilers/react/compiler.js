import React from 'react'
import _ from 'lodash'
import Promise from 'bluebird'
import path from 'path'

var beautify = require('js-beautify').js_beautify

// acorn jsx parse
var acorn = require('acorn-jsx')
// var escodegen = require('escodegen')
var escodegen = require('escodegen-wallaby')

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
    return new Promise((resolve, reject) => {
        try {
            var ast = acorn.parse(code, {plugins: {jsx: true}})
            var tokens = ast.body.map((node) => ({
                type: node.type,
                node,
                codeString: escodegen.generate(node)
            }))
            resolve(tokens)
        } catch(e) {
            console.log('error parsing code', e.toString())
            reject(e)
        }
    })
}

function checkSyntaxErrors(code) {
    return new Promise((resolve, reject) => {
        try {
            const ast = acorn.parse(code, {
                            plugins: {jsx: true},
                            sourceType: 'module',
                        })
            resolve('No Errors')
        } catch (e) {
            reject(e)
        }
    })
}

function getAssignmentStatements(tokens) {
    return tokens.filter(token => token.type === 'VariableDeclaration')
                .reduce((acc, token) => `${acc}\n${token.codeString}`, '')
}

function isRenderCall(token) {
    return token.type === 'ExpressionStatement'
            && token.node.expression.type === 'CallExpression'
            && token.node.expression.callee.name === 'render'
}

function getJSXExpr(token) {
    return _.trimStart(token.codeString.slice(7, token.codeString.length - 2))
}

function getJSXExprs(tokens) {
    return tokens.filter(isRenderCall)
                .map(getJSXExpr)
}

function isExpression(token) {
    return token.type === 'ExpressionStatement'
}

function getJSXFileContent(token, assignmentStatements) {
    const jsxExpr = getJSXExpr(token)

    return `import React from 'react'
import Comp from './code.js'

${assignmentStatements}

var CompUser = React.createClass({
    render() {
        return (<div>
            ${jsxExpr}
        </div>)
    }
})

export default CompUser`
}

var crypto = require('crypto');

function writePlaygroundCodeToFile(code) {
    return tokenize(code)
            .then((tokens) => {
                const assignmentStatements = getAssignmentStatements(tokens)
                const fileNames = tokens.filter(isExpression).map((token) => {
                    const fileName = crypto.createHash('md5').update(token.codeString).digest('hex').slice(0,6)
                    if(isRenderCall(token)) {
                        fs.writeFileSync(basePath + '/' + fileName + '.js', getJSXFileContent(token, assignmentStatements))
                    } else {
                        fs.writeFileSync(basePath + '/' + fileName + '.js', token.codeString)
                    }

                    return fileName
                })

                const alphabets = _.toUpper('abcdefghijklmnopqrstuvwxyz')
                const importStatements = fileNames.map((fileName, index) => {
                    return `import ${alphabets[index]} from './${fileName}.js'`
                }).join('\n')
                const jsxElements = fileNames.map((fileName, index) => {
                    return `<${alphabets[index]}/>`
                }).join('\n')

                const indexFileContent = `import React from 'react'
import Comp from './code.js'
${importStatements}

var App = React.createClass({
    render() {
        return (
            <div>
                ${jsxElements}
            </div>
        )
    }
})

module.exports = App
`
                return writeFile(indexFilePath, indexFileContent)
            })
            .catch(e => console.log('error generating tokens: ', e.toString()))

}

let pendingPromise = null

function compile(code, playgroundCode, openFilePath) {
    pendingPromise = Promise.pending()
    return checkSyntaxErrors(code)
            .then(() => writeCodeToFile(code))
            .then(() => writePlaygroundCodeToFile(playgroundCode))
            .catch((e) => {
                console.log('syntax error', e.toString())
                pendingPromise.reject(e.toString())
            })
            .then(() => pendingPromise.promise)
}

function cleanUp() {

}

function onNewFileLoad() {

}

function formatCode(code) {
    return Promise.resolve(beautify(code, {indent_size: 4, e4x: true}))
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
            pendingPromise.reject(err)
        } else {
            const bundle = fs.readFileSync(bundleFilePath).toString()

            try {
                eval(bundle)
            } catch(e) {
                console.log('error evaluating bundle', e.toString())
                return pendingPromise.reject(e)
            }

            let App = null
            let createElementError = null
            try {
                App = React.createElement(module.exports)
            } catch(e) {
                App = null
                createElementError = e
            }

            if(App) {
                return pendingPromise.resolve(App)
            } else {
                return pendingPromise.reject(e)
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
