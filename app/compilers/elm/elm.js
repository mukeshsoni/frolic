import React from 'react'
import Promise from 'bluebird'
import Elm from 'react-elm-components'

var path = require('path')
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

    return (
        <div style={{height: '100%', background: '#D8000C'}}>
            <pre>{correctedErrorString}</pre>
        </div>
    )
}

const tempFolderName = '.frolic'
let lastOpenFilePath = ''
let packageJsonTemplateFileContents = require('./temp/elm-package-template.js')

function writeSourcesToElmPackageJson(packageJsonTemplateFileContents, basePath) {
    const packageJsonFilePath = `${tempFolderPath}/elm-package.json`

    let packageJsonFileContents = {
        ...packageJsonTemplateFileContents,
        'source-directories': _.uniq(packageJsonTemplateFileContents["source-directories"].concat(path.resolve(basePath)))
    }

    if(basePath !== path.resolve(tempFolderPath)) {
        let folderToCheck = basePath
        let filesInFolderToCheck
        let depth = 0
        const maxDepth = 25
        while(true && depth < maxDepth) {
            depth += 1
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

                folderToCheck = _.initial(folderToCheck.split('/')).join('/') || '/'
            }
        }
    }

    return writeJsonFile(packageJsonFilePath, packageJsonFileContents, {spaces: 4})
}

/*
 * Update elm-package.json src property to include path from where the file is loaded
 */
function updateFileSources(openFilePath) {
    openFilePath = openFilePath || tempFolderPath
    if(lastOpenFilePath === openFilePath) {
        return Promise.resolve(true)
    } else {
        lastOpenFilePath = openFilePath
    }

    return writeSourcesToElmPackageJson(packageJsonTemplateFileContents, openFilePath)
}

function writeCodeToFile(code, codePath) {
    let moduleName = 'UserCode'
    let codeToWrite = code.trim()

    // if module declaration is there in the panel, don't add it again
    if(code.startsWith('module ')) {
        const inlineModuleName = _.words(code)[1]
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
                    if(cleanUpExpression(line)[0] === ' ' && index !== 0) {
                        return acc.slice(0, acc.length - 1).concat({
                            ...acc[acc.length - 1],
                            newlines: acc[acc.length - 1].newlines + 1,
                            value: acc[acc.length - 1].value + ' ' + _.trim(cleanUpExpression(line)),
                        })
                    }

                    return acc.concat({
                        newlines: 1,
                        lineNumber: index,
                        value: cleanUpExpression(line)
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
    return expression.commands.map((command) => {
        if(command.value.trim().length === 0) {
            return '"\n"'
        } else {
            return `Basics.toString (${cleanUpExpression(command.value)}),` + _.times(command.newlines, _.constant('\n')).map(() => '"\n"').join(',')
        }
    }).join(',')
}

function cleanUpExpression(expr) {
    return _.trimEnd(expr.split('--')[0])
}

function getSimpleExpressionChunk(expression) {
    return `(String.concat [${getToStrings(expression)}])`
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

let cachedCode = ''
let cachedComponentKeys = {}

function getExpressionValue(expr) {
    if(expr.commands) {
        return expr.commands.reduce((acc, command) => acc + cleanUpExpression(command.value), '')
    } else {
        return cleanUpExpression(expr.value)
    }
}
/*
 * if the key for the component is not cached and generated afresh every time, two bad things happen
 * 1. All components lose all their state
 * 2. All components are redrawn by react, which leads to flashing of all components on each compile
 * But caching needs to take into consideration both the expression in the playground as well as the code in the code panel
 * TODO - Caching based on expression.value is both wrong and useless because we now combine expressions together into a single expression
 * Any expression in a chain changing would lead to cache busting of all other expressions (they are all in a single component anyways)
 */
function getComponentKey(expressions, index, code) {
    if(cachedCode.trim() !== code.trim() || !cachedComponentKeys[getExpressionValue(expressions[index]) + index]) {
        cachedComponentKeys[getExpressionValue(expressions[index]) + index] = Math.floor(Math.random() * 10000) + '_' + index
    } else {
        console.log('serving cached key', cachedComponentKeys[getExpressionValue(expressions[index]) + index])
    }

    return cachedComponentKeys[getExpressionValue(expressions[index]) + index]
}

var cachedSources = {}

function getSource(module, expression, index, codePath) {
    // if(!cachedSources[expression.value] || true) {
        const fileName = `main${index}`
        eval(fs.readFileSync(`${codePath}/${fileName}.js`).toString())
        cachedSources[getExpressionValue(expression)] = module.exports[_.capitalize(fileName)]
    // } else {
    //     console.log('feed source from cache', expression.value, cachedSources[expression.value])
    // }

    return cachedSources[getExpressionValue(expression)]
}

export function compile(code, playgroundCode, openFilePath) {
    // get folder path from file path
    openFilePath = openFilePath ? _.initial(openFilePath.split('/')).join('/') : null
    return updateFileSources(openFilePath)
            .then(() => writeCodeToFile(code, codePath))
            .then((userModuleName) => writeFilesForExpressions(playgroundCode.trim(), userModuleName, codePath))
            .then((expressions) => {
                return new Promise((resolve, reject) => {
                    const allPromises = expressions.map((expression, index) => {
                        const fileName = `main${index}`
                        return promisifiedExec(`cd ${codePath} && elm-make --yes ${fileName}.elm --output=${fileName}.js`)
                    })
                    return Promise.all(allPromises)
                                    .then(() => {
                                        let sources = []

                                        sources = expressions.map((expression, index) => getSource(module, expression, index, codePath))

                                        const elmComponents = sources.map((source, index) => {
                                            // bust all keys if user code has changed
                                            if(cachedCode !== code) {
                                                cachedCode = code
                                                cachedComponentKeys = {}
                                            }

                                            // only return elm component is source is not corrupted
                                            // style={{display: 'flex', justifyContent: 'center'}}
                                            if(source && source.embed) {
                                                return (
                                                    <div
                                                        key={getComponentKey(expressions, index, code)}
                                                        >
                                                        <Elm
                                                            key={getComponentKey(expressions, index, code)}
                                                            src={source}
                                                            />
                                                    </div>
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

// TODO - to be done
function generateTests(code, playgroundCode, openFilePath) {
    return '-- to be implemented'
}

function formatCode(code) {
    return promisifiedExec(`echo "${code}" | ${basePath}/elm-format --stdin`)
            // .then((formattedCode) => _.drop(formattedCode.split('\n'), 2).join('\n'))
}

// do some initialization work here
export function compiler() {
    return {compile, cleanUp, onNewFileLoad, generateTests, formatCode}
}
