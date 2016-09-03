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
// mfs.mkdirpSync(basePath)
// try {
//     mfs.writeFileSync(indexFilePath, indexFileContent)
// } catch(e) {
//     console.log('error writing file', e.toString())
// }
let watcher = null // will store handle to webpack watch, so that we can close it on cleanup

const basePath = path.resolve(__dirname)
const tempPath = basePath + '/temp'
const indexFilePath = basePath + '/index.js'
let codeFilePath = tempPath + '/code.js'
const bundleFilePath = basePath + '/bundle.js'

import webpackConfig from './webpack.config.js'
let webpackCompiler = webpack(webpackConfig)
// webpackCompiler.inputFileSystem = mfs
// webpackCompiler.outputFileSystem = mfs

// only write to temp/code.js if the file in code panel is not loaded from disk
// else, just update codeFilePath which is then used in import statements in the playground code files
function writeCodeToFile(code, openFilePath) {
    console.log('openFilePath', openFilePath)
    if(openFilePath && openFilePath !== codeFilePath) {
        codeFilePath = openFilePath
    } else {
        codeFilePath = tempPath + '/code.js'
    }

    // only write to temp/code.js if the file in code panel is not loaded from disk
    if(codeFilePath === (tempPath + '/code.js')) {
        return writeFile(codeFilePath, code)
    } else {
        return Promise.resolve({})
    }
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

function getFunctionDeclarations(tokens) {
    return tokens.filter(token => token.type === 'FunctionDeclaration')
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

function getJSXFileContent(token, assignmentStatements, fnDeclarations, moduleName) {
    const jsxExpr = getJSXExpr(token)

    return `import React from 'react'
import ${moduleName.trim()} from '${codeFilePath}'

${assignmentStatements}
${fnDeclarations}

var CompUser = React.createClass({
    render() {
        return (<div>
            ${jsxExpr}
        </div>)
    }
})

export default CompUser`
}

function getExprFileContent(token, assignmentStatements, fnDeclarations, moduleName) {
    return `import React from 'react'
import ${moduleName.trim()} from '${codeFilePath}'

${assignmentStatements}
${fnDeclarations}

var CompUser = React.createClass({
    render() {
        var exprVal = ${token.codeString}
        return (<div>
            {exprVal}
        </div>)
    }
})

export default CompUser`
}

var crypto = require('crypto');

function writePlaygroundCodeToFile(code, moduleName='Comp') {
    return tokenize(code)
            .then((tokens) => {
                const assignmentStatements = getAssignmentStatements(tokens)
                const functionDeclarations = getFunctionDeclarations(tokens)
                const fileNames = tokens.filter(isExpression).map((token) => {
                    const fileName = crypto.createHash('md5').update(token.codeString).digest('hex').slice(0,8)
                    if(isRenderCall(token)) {
                        fs.writeFileSync(tempPath + '/' + fileName + '.js', getJSXFileContent(token, assignmentStatements, functionDeclarations, moduleName))
                    } else {
                        fs.writeFileSync(tempPath + '/' + fileName + '.js', getExprFileContent(token, assignmentStatements, functionDeclarations, moduleName))
                    }

                    return 'temp/' + fileName
                })

                const alphabets = _.toUpper('abcdefghijklmnopqrstuvwxyz')
                const importStatements = fileNames.map((fileName, index) => {
                    return `import ${alphabets[index]} from './${fileName}.js'`
                }).join('\n')
                const jsxElements = fileNames.map((fileName, index) => {
                    return `<${alphabets[index]}/><br/><br/>`
                }).join('\n')

                const indexFileContent = `import React from 'react'
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

function getModuleName(code) {
    if(code.match(/export\s+default.*/)) {
        const exportLine = code.match(/export\s+default.*/)[0]
        const exportLineParts = exportLine.split(/\s+/)
        return exportLineParts.length >= 2 ? exportLineParts[2] : 'Comp'
    } else if(code.match(/module\.exports\s+=.*/)) {
        const exportLine = code.match(/module\.exports\s+=.*/)[0]
        const exportLineParts = exportLine.split(/\s+/)
        return exportLineParts.length >= 2 ? exportLineParts[2] : 'Comp'
    } else {
        return 'Comp'
    }
}

let pendingPromise = null
function compile(code, playgroundCode, openFilePath) {
    pendingPromise = Promise.pending()

    // openFilePath = openFilePath ? _.initial(openFilePath.split('/')).join('/') : null

    return checkSyntaxErrors(code)
            .then(() => writeCodeToFile(code, openFilePath))
            .then(() => getModuleName(code))
            .then((moduleName) => writePlaygroundCodeToFile(playgroundCode, moduleName))
            .catch((e) => {
                console.log('syntax error', e.toString())
                pendingPromise.reject(e.toString())
            })
            .then(() => pendingPromise.promise)
}

function cleanUp() {
    watcher.close()
}

function onNewFileLoad() {

}

function formatCode(code) {
    return Promise.resolve(beautify(code, {indent_size: 4, e4x: true}))
}

function generateTests() {
    return ''
}

function startWebpack() {
    watcher = webpackCompiler.watch({ // watch options:
        aggregateTimeout: 300, // wait so long for more changes
        poll: true // use polling instead of native watchers
        // pass a number to set the polling interval
    }, (err, stats) => {
        if(!pendingPromise) {
            return
        }

        if(err) {
            pendingPromise.reject(err)
        } else {
            if(stats && stats.compilation && stats.compilation.errors.length > 0) {
                console.log('compilation error', stats.compilation.errors)
                return pendingPromise.reject(stats.compilation.errors.map(error => error.message).join('\n'))
            }

            try {
                const bundle = fs.readFileSync(bundleFilePath).toString()
                eval(bundle)
            } catch(e) {
                console.log('error evaluating bundle', e.toString())
                return pendingPromise.reject(e)
            }

            let App = React.createElement(module.exports)

            if(App) {
                return pendingPromise.resolve(App)
            } else {
                return pendingPromise.reject(e)
            }
        }
    })
}

export function compiler() {
    startWebpack()

    return {
        compile,
        cleanUp,
        onNewFileLoad,
        formatCode,
        generateTests,
    }
}
