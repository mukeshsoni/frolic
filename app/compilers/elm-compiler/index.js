import React from 'react'
import Promise from 'bluebird'
import Elm from 'react-elm-components'
import _ from 'lodash'
const Rx = require('rxjs/Rx');

const path = require('path')
const exec = require('child_process').exec;
const fs = require('fs')
const jsonfile = require('jsonfile')

Promise.config({
  cancellation: true
})

const writeJsonFile = Promise.promisify(jsonfile.writeFile)

const writeFile = Promise.promisify(fs.writeFile)

const basePath = process.env.NODE_ENV === 'development'
                    ? 'app/compilers/elm-compiler'
                    : 'dist/app/compilers/elm-compiler'

const tempFolderPath = `${basePath}/temp`
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
  const correctedErrorString = errorString.split('\n').map((str) => {
    if (str.match(/^\d+\|/)) {
      const indexOfPipe = str.indexOf('|')
      const lineNumber = str.split('|')[0]
      const newLineNumber = lineNumber - numLinesAddedToPlaygroundFile
      return newLineNumber + str.slice(indexOfPipe)
    } else {
      return str
    }
  }).join('\n')
  .slice(errorStringPrefix.length)

  return (
    <div
      style={{
        height: '100%',
        background: '#D8000C'
      }}
    >
      <pre>{correctedErrorString}</pre>
    </div>
  )
}

let lastOpenFilePath = ''
const packageJsonTemplateFileContents = require('./temp/elm-package-template.js')

function writeSourcesToElmPackageJson(templateFileContents, basePathForEditorCode) {
  const packageJsonFilePath = `${tempFolderPath}/elm-package.json`

  let packageJsonFileContents = {
    ...templateFileContents,
    'source-directories': _.uniq(templateFileContents['source-directories'].concat([path.resolve(tempFolderPath), path.resolve(basePathForEditorCode)]))
  }

  if (basePathForEditorCode !== path.resolve(tempFolderPath)) {
    let folderToCheck = basePathForEditorCode
    let filesInFolderToCheck
    let depth = 0
    const maxDepth = 25
    while (true && depth < maxDepth) {
      depth += 1
      filesInFolderToCheck = fs.readdirSync(folderToCheck)
      if (_.includes(filesInFolderToCheck, 'elm-package.json')) {
        const tempPackageJsonContent = jsonfile.readFileSync(`${folderToCheck}/elm-package.json`)
        const sourceDirectories = tempPackageJsonContent['source-directories']

        packageJsonFileContents = {
          ...packageJsonFileContents,
          'source-directories': _.uniq(packageJsonFileContents['source-directories'].concat(_.trimEnd(`${folderToCheck}/${sourceDirectories}`, '/.')))
        }
        break;
      } else {
        if (folderToCheck === '/') {
          break;
        }

        // something line '/Users' will result in ''. hence the ||
        folderToCheck = _.initial(folderToCheck.split('/')).join('/') || '/'
      }
    }
  }

  return writeJsonFile(packageJsonFilePath, packageJsonFileContents, { spaces: 4 })
}

/*
 * Update elm-package.json src property to include path from where the file is loaded
 */
function updateFileSources(openFilePath = tempFolderPath) {
  openFilePath = openFilePath || tempFolderPath
  if (lastOpenFilePath === openFilePath) {
    return Promise.resolve(true)
  } else {
    lastOpenFilePath = openFilePath
  }

  return writeSourcesToElmPackageJson(packageJsonTemplateFileContents, openFilePath)
}

function writeCodeToFile(code) {
  const moduleName = 'UserCode'
  let codeToWrite = code.trim()

  // if module declaration is there in the panel, don't add it again
  if (code.startsWith('module ')) {
    const inlineModuleName = _.words(code)[1]
    codeToWrite = code.replace(`module ${inlineModuleName}`, 'module UserCode')
  } else if (code.trim() === '') { // if code panel is empty, insert a random function
    codeToWrite = `module ${moduleName} exposing (..)\n\nrandomIdentityFunction x = x`
  } else {
    codeToWrite = `module ${moduleName} exposing (..)\n\n${code}`
  }

  return writeFile(`${codePath}/${moduleName}.elm`, codeToWrite)
          .then(() => moduleName) // return the moduleName for playgroundFileWritercatch((err) => console.log('error writing file', `${codePath}/${moduleName}.elm`, err.toString()))
}

function isRenderExpression (code) {
  return code.startsWith('render ')
    || code.startsWith('Html.beginnerProgram')
    || code.startsWith('beginnerProgram')
    || code.startsWith('Html.program')
    || code.startsWith('App.program')
    || code.startsWith('program')
}

function getType(code) {
  if (isImportStatement(code)) {
    return 'importStatement'
  } else if (isRenderExpression(code)) {
    return 'renderExpression'
  } else if (isAssignment(code)) {
    return 'assignment'
  } else if (isTypeDeclaration(code)) {
    return 'assignment'
  } else {
    return 'expression'
  }
}

function tokenize(code) {
  return code.split('\n').reduce((acc, line, index) => {
    if (cleanUpExpression(line)[0] === ' ' && index !== 0) {
      return acc.slice(0, acc.length - 1).concat({
        ...acc[acc.length - 1],
        newlines: acc[acc.length - 1].newlines + 1,
        value: `${acc[acc.length - 1].value} ${_.trim(cleanUpExpression(line))}`
      })
    }

    return acc.concat({ newlines: 1, lineNumber: index, value: cleanUpExpression(line) })
  }, []).map((command) => ({
    ...command,
    type: getType(command.value)
  }))
  .reduce((acc, command, index) => { // bunch up expressions
    if (index !== 0 && command.type === 'expression' && _.last(acc).type === 'expression') {
      return [
        ..._.initial(acc), {
          ..._.last(acc),
          commands: _.last(acc).commands.concat(command)
        }
      ]
    }

    return acc.concat({
      ...command,
      commands: [command]
    })
  }, [])
}

function hasSubscribed(code) {
  return code.indexOf('subscriptions') >= 0
}

function getToStrings(expression) {
  return expression.commands.map((command) => {
    if (command.value.trim().length === 0) {
      return '"\n"'
    } else {
      const newLines = _.times(command.newlines, _.constant('\n')).map(() => '"\n"').join(',')
      return `Basics.toString (${cleanUpExpression(command.value)}),${newLines}`
    }
  }).join(',')
}

function cleanUpExpression(expr) {
  return _.trimEnd(expr.split('--')[0])
}

function getSimpleExpressionChunk(expression) {
  return `(String.concat [${getToStrings(expression)}])`
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
  if (expression.type === 'renderExpression') {
    const appProgram = hasSubscribed(expression.value)
      ? 'program'
      : 'beginnerProgram'

    fileContent = `module Main${counter} exposing (..)
${mainFileTemplateForComponents}
${statements}
main =
    ${appProgram} ${_.drop(expression.value.split(' ')).join(' ')}`
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

function writeFilesForExpressions(playgroundCode, userModuleName, codePath) { // eslint-disable-line no-shadow
  const tokenizedCode = tokenize(playgroundCode)
  const importStatements = tokenizedCode.filter((code) => code.type === 'importStatement').map((code) => code.value).join('\n')
  const statements = tokenizedCode.filter((code) => code.type === 'assignment').map((code) => code.value).join('\n')
  const expressions = tokenizedCode.filter((code) => code.type === 'expression' || code.type === 'renderExpression')

  const fileWritePromises = expressions.map((expression, index) => writeFile(`${codePath}/main${index}.elm`, getGeneratedMainFileContent(expression, importStatements, statements, userModuleName, index)))
  return Promise.all(fileWritePromises).then(() => expressions)
}

let cachedCode = ''
let cachedComponentKeys = {}

function getExpressionValue(expr) {
  if (expr.commands) {
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
  if (cachedCode.trim() !== code.trim() || !cachedComponentKeys[getExpressionValue(expressions[index]) + index]) {
    cachedComponentKeys[getExpressionValue(expressions[index]) + index] = `${Math.floor(Math.random() * 10000)}+${index}`
  }

  return cachedComponentKeys[getExpressionValue(expressions[index]) + index]
}

let cachedSources = {} // eslint-disable-line vars-on-top, prefer-const

function getSource(module, expression, index) {
  // if(!cachedSources[expression.value] || true) {
  const fileName = `main${index}`
  eval(fs.readFileSync(`${codePath}/${fileName}.js`).toString()) // eslint-disable-line no-eval
  cachedSources[getExpressionValue(expression)] = module.exports[_.capitalize(fileName)]
  // } else {
  //     console.log('feed source from cache', expression.value, cachedSources[expression.value])
  // }

  return cachedSources[getExpressionValue(expression)]
}

let elmMakePromises = Promise.resolve()

export function compile(code, playgroundCode, openFilePath) {
  elmMakePromises.cancel()
  // get folder path from file path
  const openFileFolderPath = openFilePath
    ? _.initial(openFilePath.split('/')).join('/')
    : null
  return updateFileSources(openFileFolderPath)
          .then(() => writeCodeToFile(code))
          .then((userModuleName) => writeFilesForExpressions(playgroundCode.trim(), userModuleName, codePath))
          .then((expressions) => { // eslint-disable-line arrow-body-style
            return new Promise(() => {
              const allPromises = expressions.map((expression, index) => {
                const fileName = `main${index}`
                return promisifiedExec(`cd ${codePath} && elm-make --yes ${fileName}.elm --output=${fileName}.js`)
              })
              elmMakePromises = new Promise((resolve, reject, onCancel) => {
                // on cancellation of promise
                onCancel(() => {
                  ps.lookup({
                    command: 'elm-make',
                    psargs: 'ax'
                  }, (err, resultList) => {
                    if (err) {
                      console.log('error getting command info', err.toString()) // eslint-disable-line no-console
                    } else {
                      resultList.forEach((process) => {
                        ps.kill(process.pid, (errorGettingProcessInfo) => {
                          if (errorGettingProcessInfo) {
                            console.error('Error killing process ', errorGettingProcessInfo.toString()) // eslint-disable-line no-console
                          }
                        })
                      })
                    }
                  })
                })
                return Promise.all(allPromises)
                  .then(resolve)
                  .then(() => {
                    let sources = []

                    sources = expressions.map((expression, index) => getSource(module, expression, index))

                    const elmComponents = sources.map((source, index) => {
                      // bust all keys if user code has changed
                      if (cachedCode !== code) {
                        cachedCode = code
                        cachedComponentKeys = {}
                      }

                      // only return elm component is source is not corrupted
                      // style={{display: 'flex', justifyContent: 'center'}}
                      if (source && source.embed) {
                        return (
                          <div key={getComponentKey(expressions, index, code)}>
                            <Elm key={getComponentKey(expressions, index, code)} src={source} />
                          </div>
                        )
                      } else {
                        return <span>a</span>
                      }
                    })

                    subscriber.next(elmComponents)
                  })
                  .catch(reject)
                })
                .catch((err) => {
                  console.error('elm compilation error', err.toString()) // eslint-disable-line no-console
                  subscriber.next(getFormattedError(err))
                })
            })
          })
}

function onNewFileLoad(openFilePath) {
  const openFileFolderPath = openFilePath
    ? _.initial(openFilePath.split('/')).join('/')
    : null
  updateFileSources(openFileFolderPath)
}

function cleanUp() {
  if (subscriber) {
    subscriber.complete()
  }
  // const files = fs.readdirSync(tempFolderPath)
  // files.filter((file) => file !== 'Main.elm' && (file.split('.')[1] === 'elm' || file.split('.')[1] === 'js'))
  //         .map((file) => fs.unlink(tempFolderPath + '/' + file))
}

// TODO - to be done
function generateTests() {
  return '-- to be implemented'
}

function formatCode(code) {
  const cmd = `${basePath}/elm-format --stdin`

  function execFormat(callback) {
    const child = exec(cmd, callback)
    child.stdin.write(code)
    child.stdin.end()
    return child
  }

  return Promise.promisify(execFormat)()
  // .then((formattedCode) => _.drop(formattedCode.split('\n'), 2).join('\n'))
}

let subscriber = null
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

// do some initialization work here
export function compiler() {
  return {
    compile,
    cleanUp,
    onNewFileLoad,
    generateTests,
    formatCode,
    outputStream: getObservable(),
    onCodeChange,
    onPlaygroundCodeChange,
    editorMode: 'elm',
    extensions: ['elm'],
    sampleCode: 'add x y = x + y',
    samplePlaygroundCode: 'add 1 2'
  }
}
