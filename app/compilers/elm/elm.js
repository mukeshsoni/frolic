import React from 'react'
import Promise from 'bluebird'
import Elm from 'react-elm-components'

var exec = require('child_process').exec;
var fs = require('fs')
var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)

var mkdirp = Promise.promisify(require('mkdirp'));

const basePath = 'app/compilers/elm'
const tempFolderPath = basePath + '/temp'
const codePath = tempFolderPath
const promisifiedExec = Promise.promisify(exec)

function isAssignment(command) {
    return command.split(' ').indexOf('=') >= 0
}

function isTypeDeclaration(command) {
    return command.split(' ').indexOf(':') === 1
}

function isImportStatement(command) {
    return command.startsWith('import ')
}

const numLinesAddedToPlaygroundFile = 5
function getFormattedError(error) {
    const errorStringPrefix = 'Error: Command failed: cd temp && elm-make Main.elm --output=main.js && node main.js';
    const errorString = error.toString()
    const correctedErrorString = errorString.split('\n')
                                    .map((str) => {
                                        if(str.match(/^\d+\|/)) {
                                            const indexOfPipe = str.indexOf('|')
                                            const lineNumber = str.split('|')[0]
                                            const newLineNumber = lineNumber - numLinesAddedToPlaygroundFile
                                            return newLineNumber + str.slice(indexOfPipe)
                                        } else {
                                            return str
                                        }
                                    })
                                    .join('\n')
                                    .slice(errorStringPrefix.length)

    return <pre>{correctedErrorString}</pre>
}

const tempFolderName = '.frolic'
let lastOpenFilePath = ''

/*
 * Update elm-package.json src property to include path from where the file is loaded
 */
function updateFileSources(openFilePath) {
    if(lastOpenFilePath === openFilePath) {
        return Promise.resolve({})
    }

    lastOpenFilePath = openFilePath

    let pathToAdd = "."

    if(openFilePath) {
        pathToAdd = openFilePath
    }

    const packageJsonFilePath = `${tempFolderPath}/elm-package.json`
    return readFile(packageJsonFilePath)
            .then((packageJsonFile) => {
                let packageJsonFileContents = JSON.parse(packageJsonFile.toString())
                packageJsonFileContents["source-directories"] = _.uniq(packageJsonFileContents["source-directories"].concat(pathToAdd))
                return writeFile(packageJsonFilePath, JSON.stringify(packageJsonFileContents))
            })
            .catch((err) => {
                console.log('error parsing file: ', err.toString())
            })
}

function writeCodeToFile(code, codePath) {
    let moduleName = 'UserCode'
    let codeToWrite = code

    // if module declaration is there in the panel, don't add it again
    if(code.startsWith('module ')) {
        moduleName = code.split(' ')[1]
    } else if(code.trim() === '') { // if code panel is empty, insert a random function
        codeToWrite = `module ${moduleName} exposing (..)\n\nrandomIdentityFunction x = x`
    } else {
        codeToWrite = `module ${moduleName} exposing (..)\n\n${code}`
    }

    return writeFile(`${codePath}/${moduleName}.elm`, codeToWrite)
            .then(() => moduleName) // return the moduleName for playgroundFileWriter
            .catch((err) => console.log('error writing file', `${codePath}/${moduleName}.elm`, err.toString()))
}

function isRenderExpression(code) {
    return code.startsWith('render ')
}

function getType(code) {
    if(isImportStatement(code)) {
        return 'importStatement'
    } else if(isRenderExpression(code)) {
        return 'renderExpression'
    } else if(isAssignment(code)) {
        return 'assignment'
    } else if(isTypeDeclaration(code)) {
        return 'assignment'
    } else {
        return 'expression'
    }
}

function tokenize(code) {
    return code.split('\n')
                .reduce((acc, line, index, original) => {
                    if(line[0] === ' ' && index !== 0) {
                        return acc.slice(0, acc.length - 1).concat({
                            newlines: acc[acc.length - 1].newlines + 1,
                            value: acc[acc.length - 1].value + ' ' + line,
                        })
                    }

                    return acc.concat({
                        newlines: 1,
                        value: line
                    })
                }, [])
                .map((command) => {
                    return {
                        ...command,
                        type: getType(command.value)
                    }
                })
}

function getSimpleExpressionChunk(chunk) {
    if(chunk === '') {
        return '" "'
    } else {
        return '(toString (' + chunk + '))'
    }
}

function hasSubscribed(code) {
    return code.indexOf('subscriptions') >= 0
}

function getGeneratedMainFileContent(expression, importStatements, statements, userModuleName, counter) {
    const mainFileTemplate = `import Html.App as Html
import Html exposing (..)
import ${userModuleName} exposing (..)
${importStatements}
`

    const mainFileTemplateForComponents = `import Html.App as Html
import Html.App exposing (beginnerProgram, program)
import Html exposing (..)
${importStatements}
import ${userModuleName} exposing (..)`

    let fileContent
    if(expression.type === 'renderExpression') {
        const appProgram = hasSubscribed(expression.value) ? 'program' : 'beginnerProgram'

        fileContent = `module Main${counter} exposing (..)
${mainFileTemplateForComponents}
${statements}
main =
    ${appProgram} ${expression.value.slice(7)}`
    } else {
        fileContent = `module Main${counter} exposing (..)
${mainFileTemplate}
${statements}
main = text ${getSimpleExpressionChunk(expression.value)}`
    }

    return fileContent
}

function writeFilesForExpressions(playgroundCode, userModuleName, codePath) {
    const tokenizedCode = tokenize(playgroundCode)
    const importStatements = tokenizedCode.filter((code) => code.type === 'importStatement').map((code) => code.value).join('\n')
    const statements = tokenizedCode.filter((code) => code.type === 'assignment').map((code) => code.value).join('\n')
    const expressions = tokenizedCode.filter((code) => code.type === 'expression' || code.type === 'renderExpression')

    let counter = 1

    const fileWritePromises = expressions.map((expression, index) => {
                                    return writeFile(`${codePath}/main${index}.elm`, getGeneratedMainFileContent(expression, importStatements, statements, userModuleName, index))
                                })
    return Promise.all(fileWritePromises).then(() => expressions)
}

export function compile(code, playgroundCode, openFilePath) {
    // get folder path from file path
    openFilePath = openFilePath ? _.initial(openFilePath.split('/')).join('/') : null
    return updateFileSources(openFilePath)
            .then(() => writeCodeToFile(code, codePath))
            .then((userModuleName) => writeFilesForExpressions(playgroundCode, userModuleName, codePath))
            .then((expressions) => {
                return new Promise((resolve, reject) => {
                    const allPromises = expressions.map((expression, index) => {
                        const fileName = `main${index}`
                        return promisifiedExec(`cd ${codePath} && elm-make --yes ${fileName}.elm --output=${fileName}.js`)
                    })
                    return Promise.all(allPromises)
                                    .then(() => {
                                        let sources = []

                                        expressions.forEach((expression, index) => {
                                            const fileName = `main${index}`
                                            eval(fs.readFileSync(`${codePath}/${fileName}.js`).toString())
                                            sources.push(module.exports[_.capitalize(fileName)])
                                        })

                                        const elmComponents = sources.map((source, index) => {
                                            // only return elm component is source is not corrupted
                                            if(source && source.embed) {
                                                const key = Math.floor(Math.random()*10000) + expressions[index].value + '_' + index
                                                return (
                                                    <Elm
                                                        key={key}
                                                        src={source}
                                                        />
                                                )
                                            } else {
                                                return <span>a</span>
                                            }
                                        })

                                        resolve(elmComponents)
                                    })
                                    .catch((err) => {
                                        console.log('elm compilation error', err.toString())
                                        resolve(getFormattedError(err))
                                    })
                })
            })
}

function cleanUp() {
    console.log('cleaning up elm compiler folder')
    const files = fs.readdirSync(tempFolderPath)
    files.filter((file) => file !== 'Main.elm' && (file.split('.')[1] === 'elm' || file.split('.')[1] === 'js'))
            .map((file) => fs.unlink(tempFolderPath + '/' + file))
}

// do some initialization work here
export function compiler() {
    return {compile, cleanUp}
}
