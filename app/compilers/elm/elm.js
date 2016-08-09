import React from 'react'
import Promise from 'bluebird'
import Elm from 'react-elm-components'

var exec = require('child_process').exec;
var fs = require('fs')
var jsonfile = require('jsonfile')
var writeJsonFile = Promise.promisify(jsonfile.writeFile)

var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)

var mkdirp = Promise.promisify(require('mkdirp'));

const basePath = process.env.NODE_ENV === 'development' ? 'app/compilers/elm' : 'dist/app/compilers/elm'

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
let packageJsonTemplateFileContents = null

function writeSourcesToElmPackageJson(packageJsonTemplateFileContents, basePath) {
    const packageJsonFilePath = `${tempFolderPath}/elm-package.json`
    let packageJsonFileContents = {
        ...packageJsonTemplateFileContents,
        'source-directories': _.uniq(packageJsonTemplateFileContents["source-directories"].concat(basePath))
    }

    if(basePath !== '.') {
        let folderToCheck = basePath
        let filesInFolderToCheck
        while(true) {
            filesInFolderToCheck = fs.readdirSync(folderToCheck)
            if(_.includes(filesInFolderToCheck, 'elm-package.json')) {
                const tempPackageJsonContent = jsonfile.readFileSync(`${folderToCheck}/elm-package.json`)
                let sourceDirectories = tempPackageJsonContent['source-directories']

                packageJsonFileContents = {
                    ...packageJsonFileContents,
                    'source-directories': _.uniq(packageJsonFileContents['source-directories'].concat(_.trimEnd(`${folderToCheck}/${sourceDirectories}`, '/.')))
                }
                break;
            } else {
                if(folderToCheck === '/') {
                    break;
                }

                folderToCheck = _.initial(folderToCheck.split('/')).join('/')
            }
        }
    }

    return writeJsonFile(packageJsonFilePath, packageJsonFileContents, {spaces: 4})
}

function getPackageTemplate() {
    const packageJsonTemplateFilePath = `${tempFolderPath}/elm-package-template.json`

    // if already read, read from cached file
    if(packageJsonTemplateFileContents) {
        return Promise.resolve(packageJsonTemplateFileContents)
    } else {
        packageJsonTemplateFileContents = jsonfile.readFileSync(packageJsonTemplateFilePath)
        return Promise.resolve(packageJsonTemplateFileContents)
    }
}

/*
 * Update elm-package.json src property to include path from where the file is loaded
 */
function updateFileSources(openFilePath) {
    openFilePath = openFilePath || '.'
    if(lastOpenFilePath === openFilePath) {
        return Promise.resolve(true)
    } else {
        lastOpenFilePath = openFilePath
    }

    return getPackageTemplate().then((templateContents) => {
                return writeSourcesToElmPackageJson(templateContents, openFilePath)
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
        const inlineModuleName = code.split(' ')[1]
        codeToWrite = code.replace(`module ${inlineModuleName}`, 'module UserCode')
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
                .reduce((acc, line, index) => {
                    if((line[0] === ' ' && index !== 0)) {
                        return acc.slice(0, acc.length - 1).concat({
                            ...acc[acc.length - 1],
                            newlines: acc[acc.length - 1].newlines + 1,
                            value: acc[acc.length - 1].value + _.trimStart(line),
                        })
                    }

                    return acc.concat({
                        newlines: 1,
                        lineNumber: index,
                        value: line
                    })
                }, [])
                .map((command) => {
                    return {
                        ...command,
                        type: getType(command.value)
                    }
                })
                .reduce((acc, command, index) => { // bunch up expressions
                    if(index !== 0 && command.type === 'expression' && _.last(acc).type === 'expression') {
                        return [
                            ..._.initial(acc),
                            {
                                ..._.last(acc),
                                commands: _.last(acc).commands.concat(command),
                            }
                        ]
                    }

                    return acc.concat({
                        ...command,
                        commands: [command],
                    })
                }, [])
}

function hasSubscribed(code) {
    return code.indexOf('subscriptions') >= 0
}

function getToStrings(expression) {
    console.log(expression.commands)
    return expression.commands.map((command) => {
        if(command.value === '') {
            return '"\n"'
        } else {
            return `Basics.toString (${command.value}),` + _.times(command.newlines, _.constant('\n')).map(() => '"\n"').join(',')
        }
    }).join(',')
}

function getSimpleExpressionChunk(expression) {
    if(expression.value === '') {
        return '" "'
    } else {
        return `(String.concat [${getToStrings(expression)}])`
    }
}

const SPACE = ' '
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
import String
${mainFileTemplate}
${statements}
main =
    pre []
        [ text ${getSimpleExpressionChunk(expression)} ]`
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

let cachedCode = null
let cachedComponentKeys = {}

/*
 * if the key for the component is not cached and generated afresh every time, two bad things happen
 * 1. All components lose all their state
 * 2. All components are redrawn by react, which leads to flashing of all components on each compile
 * But caching needs to take into consideration both the expression in the playground as well as the code in the code panel
 * TODO - Caching based on expression.value is both wrong and useless because we now combine expressions together into a single expression
 * Any expression in a chain changing would lead to cache busting of all other expressions (they are all in a single component anyways)
 */
function getComponentKey(expressions, index, code) {
    if(cachedCode === code && cachedComponentKeys[expressions[index].value]) {
        return
        return expressions[index].value + '_' + index
    } else {
        cachedCode = code
        cachedComponentKeys[expressions[index]] = Math.floor(Math.random() * 10000) + '_index'
        return cachedComponentKeys[expressions[index]]
    }
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
                                                return (
                                                    <Elm
                                                        key={getComponentKey(expressions, index, code)}
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

function onNewFileLoad(openFilePath) {
    openFilePath = openFilePath ? _.initial(openFilePath.split('/')).join('/') : null
    updateFileSources(openFilePath)
}

function cleanUp() {
    console.log('cleaning up elm compiler folder')
    const files = fs.readdirSync(tempFolderPath)
    files.filter((file) => file !== 'Main.elm' && (file.split('.')[1] === 'elm' || file.split('.')[1] === 'js'))
            .map((file) => fs.unlink(tempFolderPath + '/' + file))
}

// do some initialization work here
export function compiler() {
    return {compile, cleanUp, onNewFileLoad}
}
