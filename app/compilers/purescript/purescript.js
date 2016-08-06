import React from 'react'
import Promise from 'bluebird'
import _ from 'lodash'
var exec = require('child_process').exec;
var fs = require('fs')
var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)

const basePath = 'app/compilers/purescript'
const tempFolderPath = basePath + '/temp'

function isAssignment(command) {
    return command.split(' ').indexOf('=') >= 0
}

function isTypeDeclaration(command) {
    return command.split(' ').indexOf(':') === 1
}

function getNewlineExpresssions(n) {
    return Array(n).fill({
            type: 'expression',
            value: '"<newline>"'
        })
}

function getFormattedOutput(stdout) {
    // cutoff last 5 characters produced by Debug.log
    return <pre>{stdout.replace(/"<newline>"/g, '\n').substring(0, stdout.length - 3)}</pre>
}

const numLinesAddedToPlaygroundFile = 5
function getFormattedError(error) {
    const errorString = error.toString()
    const errorStringStartIndex = errorString.indexOf('Error found:');
    const correctedErrorString = errorString.slice(errorStringStartIndex)

    return <pre>{correctedErrorString}</pre>
}

function writeCodeToFile(code, moduleName = 'UserCode') {
    let codeToWrite = code
    const importGeneric = 'import Data.Generic\n'

    // if module declaration is there in the panel, don't add it again
    if(code.startsWith('module ')) {
        moduleName = code.split(' ')[1]
    } else {
        codeToWrite = `module ${moduleName} where\n\n${importGeneric}\n\nimport Prelude\n\n${code}`
    }

    const filePath = `${tempFolderPath}/src/${moduleName}.purs`
    return writeFile(filePath, codeToWrite)
            .then(() => moduleName) // return the moduleName for playgroundFileWriter
}

function addPlaygroundCallsToList(playgroundCode = 'add 2 4') {
    const lines = playgroundCode
                    .split('\n')
                    .reduce((acc, line, index, original) => {
                        if(line[0] === ' ' && index !== 0) {
                            return acc.slice(0, acc.length - 1).concat({
                                newlines: acc[acc.length - 1].newlines + 1,
                                value: acc[acc.length - 1].value + ' ' + line
                            })
                        }

                        return acc.concat({
                            newlines: 1,
                            value: line
                        })
                    }, [])
                    .reduce((acc, command) => {
                        if(command.value.trim() === '') {
                            return acc.concat(getNewlineExpresssions(command.newlines))
                        } else if(isAssignment(command.value)) {
                            return acc.concat({
                                type: 'assignment',
                                value: command.value
                            }).concat(getNewlineExpresssions(command.newlines))
                        } else if(isTypeDeclaration(command.value))  {
                            return acc.concat({
                                type: 'assignment',
                                value: command.value
                            }).concat(getNewlineExpresssions(command.newlines))
                        } else {
                            return acc.concat({
                                type: 'expression',
                                value: 'show (' + command.value + ')'
                            }).concat(getNewlineExpresssions(command.newlines))
                        }
                    }, [])
    const initialLines = lines.filter((line) => line.type === 'assignment')
                                .reduce((acc, line) => {
                                    if(acc === '') {
                                        return line.value
                                    } else {
                                        return acc + '\n' + line.value
                                    }
                                }, '')

    const expressions = lines.filter((line) => line.type === 'expression')
                                .map(line => line.value)
                                .join(',')

    return initialLines + '\n\n' + 'toRun = [' + expressions + ']'
}

function writePlaygroundCodeToFile(playgroundCode, userModuleName) {
    const moduleDefinition = 'module PlaygroundCode where\n'
    const importPrelude = 'import Prelude\n'
    const importList = 'import Data.Foldable\n'
    const importUserCodeString = `import ${userModuleName} as ${userModuleName}\n\n`
    const playgroundCodeCalls = addPlaygroundCallsToList(playgroundCode)

    const filePath = `${tempFolderPath}/src/PlaygroundCode.purs`
    return writeFile(filePath, moduleDefinition + importPrelude + importList + importUserCodeString + playgroundCodeCalls)
}

export function compile(code, playgroundCode) {
    return writeCodeToFile(code)
            .then((userModuleName) => writePlaygroundCodeToFile(playgroundCode, userModuleName))
            .then(() => {
                return new Promise((resolve, reject) => {
                    exec(`cd ${tempFolderPath} && pulp run`, (err, stdout, stderr) => {
                        if(err) {
                            console.log('purescript compilation error', err.toString())
                            resolve(getFormattedError(err))
                        } else {
                            resolve(getFormattedOutput(stdout))
                        }
                    })
                })
            })
}

function cleanUp() {
    console.log('cleaning up purescript temp space')
    const files = fs.readdirSync(tempFolderPath + '/src')
    files.filter((file) => file !== 'Main.purs' && (file.split('.')[1] === 'purs'))
            .map((file) => fs.unlink(tempFolderPath + '/src/' + file))
}

// do some initialization work here
export function compiler() {
    return {
        compile,
        cleanUp
    }
}
