import React from 'react'
import _ from 'lodash'
import Promise from 'bluebird'
import path from 'path'
var Rx = require('rxjs/Rx');
var flowRemoveTypes = require('flow-remove-types');
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
console.log('basePath', basePath)
const tempPath = basePath + '/temp'
const indexFilePath = basePath + '/index-for-webpack.js'
let codeFilePath = tempPath + '/code.js'
const bundleFilePath = basePath + '/bundle.js'

import webpackConfig from './webpack.config.js'
let webpackCompiler = webpack(webpackConfig)
// webpackCompiler.inputFileSystem = mfs
// webpackCompiler.outputFileSystem = mfs

// only write to temp/code.js if the file in code panel is not loaded from disk
// else, just update codeFilePath which is then used in import statements in the playground code files
function writeCodeToFile(code, openFilePath) {
    const tempCodePath = tempPath + '/code.js'
    console.log('openFilePath', openFilePath)
    if(openFilePath && openFilePath !== tempCodePath) {
        codeFilePath = openFilePath
    } else {
        codeFilePath = tempCodePath
    }

    // only write to temp/code.js if the file in code panel is not loaded from disk
    if(codeFilePath === tempCodePath) {
        return writeFile(codeFilePath, code)
    } else {
        console.log('not writing code file')
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
                const filePaths = tokens.filter(isExpression).map((token) => {
                    const fileName = crypto.createHash('md5').update(token.codeString).digest('hex').slice(0,8)
                    const filePath = tempPath + '/' + fileName + '.js'

                    // don't need to write the file again, if it's already there (md5 checksum ensures content is same)
                    if(!fs.existsSync(filePath)) {
                        if(isRenderCall(token)) {
                            fs.writeFileSync(filePath, getJSXFileContent(token, assignmentStatements, functionDeclarations, moduleName))
                        } else {
                            fs.writeFileSync(filePath, getExprFileContent(token, assignmentStatements, functionDeclarations, moduleName))
                        }
                    } else {
                        console.log('yay! didn\'t need to write playground file for code', token.codeString)
                    }

                    return 'temp/' + fileName
                })

                const alphabets = _.toUpper('abcdefghijklmnopqrstuvwxyz')
                const importStatements = filePaths.map((filePath, index) => {
                    return `import ${alphabets[index]} from '${filePath}'`
                }).join('\n')
                const jsxElements = filePaths.map((filePaths, index) => {
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
            // .catch(e => console.log('error generating tokens: ', e.toString()))

}

function getModuleName(code) {
    if(code.match(/export\s+default.*/)) {
        const exportLine = code.match(/export\s+default.*/)[0]
        const exportLineParts = exportLine.split(/\s+/)
        return exportLineParts.length >= 2 ? _.trimEnd(exportLineParts[2], ';') : 'Comp'
    } else if(code.match(/module\.exports\s+=.*/)) {
        const exportLine = code.match(/module\.exports\s+=.*/)[0]
        const exportLineParts = exportLine.split(/\s+/)
        return exportLineParts.length >= 2 ? _.trimEnd(exportLineParts[2], ';') : 'Comp'
    } else {
        return 'Comp'
    }
}

let pendingPromise = null
function compile(code, playgroundCode, openFilePath) {
    // pendingPromise = Promise.pending()
    return checkSyntaxErrors(flowRemoveTypes(code))
            .then(() => writeCodeToFile(code, openFilePath))
            .then(() => getModuleName(code))
            .then((moduleName) => writePlaygroundCodeToFile(playgroundCode, moduleName))
            .catch((e) => {
                console.log('syntax error', e.toString())
                subscriber.next(e.toString())
            })
}

function cleanUp() {
    if(subscriber) {
        subscriber.complete()
    }

    if(watcher) {
        watcher.close()
    }
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
        if(!subscriber) {
            return
        }

        if(err) {
            console.log('error compiling webpack', err)
            return subscriber.next(err)
        } else {
            if(stats && stats.compilation && stats.compilation.errors.length > 0) {
                console.log('compilation error', stats.compilation.errors)
                return subscriber.next(stats.compilation.errors.map(error => error.message).join('\n'))
            }

            try {
                const bundle = fs.readFileSync(bundleFilePath).toString()
                eval(bundle)
            } catch(e) {
                console.log('error evaluating bundle', e)
                return subscriber.next(e)
            }

            let App = React.createElement(module.exports)

            if(App) {
                return subscriber.next(App)
            } else {
                return subscriber.next(e)
            }
        }
    })
}

var subscriber = null
function getObservable() {
    return Rx.Observable.create((o) => {
        subscriber = o
    })
}

function onCodeChange(code, playgroundCode, openFilePath) {
    return this.compile(code, playgroundCode, openFilePath)
}

function onPlaygroundCodeChange(code, playgroundCode, openFilePath) {
    return this.compile(code, playgroundCode, openFilePath)
}

export function compiler() {
    startWebpack()

    return {
        compile,
        cleanUp,
        onNewFileLoad,
        formatCode,
        generateTests,
        outputStream: getObservable(),
        onCodeChange,
        onPlaygroundCodeChange,
        editorMode: 'jsx',
        extensions: ['js', 'jsx'],
        sampleCode: `import React from 'react'
// import EmptyFolder from 'pp/modules/documents/views/pastelabel/index.js'
import SB from 'pp/shared/ui/buttons/submitbutton'
import Badge from 'pp/shared/ui/badge'
import 'pp/core/less/pp-core.less'

var MyComp = React.createClass({
    getInitialState() {
        return {value: this.props.value}
    },
    getDefaultProps() {
        return {
            count: 10,
            label: 'Submit',
            borderRadius: 3
        }
    },
    handleClick(e) {
        alert('wow!')
    },
    render() {
        let style = {
            borderRadius: this.props.borderRadius
        }

        return  <div>
            <SB label={this.props.label} onClick={this.handleClick}/>
            <Badge count={this.props.count} style={style}/>
        </div>
    }
})

export default MyComp
`,
        samplePlaygroundCode: `render(<MyComp label='Submit' count={20}/>)

render(<MyComp label='Skicka' count={40}/>)`
    }
}
