import React from 'react'
import Promise from 'bluebird'
import Elm from 'react-elm-components'
import _ from 'lodash'
const Rx = require('rxjs/Rx');
const ps = require('ps-node')
const path = require('path')
const exec = require('child_process').exec;
const fs = require('fs')
const jsonfile = require('jsonfile')

import { tokenize } from './parser.js'
import {
  createHash,
  cleanUpExpression,
  getExpressionValue,
} from './helpers'

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
 * TODO - this function should be called just before the elm-make step and not in the beginning
 */
function updateFileSources(openFilePath = tempFolderPath) {
  if ((openFilePath && lastOpenFilePath === openFilePath) || (!openFilePath && lastOpenFilePath === tempFolderPath)) {
    return Promise.resolve(true)
  } else {
    lastOpenFilePath = openFilePath || tempFolderPath
  }

  return writeSourcesToElmPackageJson(packageJsonTemplateFileContents, openFilePath || tempFolderPath)
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


function getSimpleExpressionChunk(expression) {
  return `(String.concat [${getToStrings(expression)}])`
}

function getGeneratedFrolicFileContent(expression, importStatements, statements, userModuleName, counter) {
  const mainFileTemplateForComponents = `import Html.App as Html
import Html.App exposing (beginnerProgram, program)
import Html exposing (..)
${importStatements}
import ${userModuleName} exposing (..)`

  let fileContent = ''
  if (expression.value.startsWith('$view')) {
    fileContent = `module F${expression.hash} exposing (..)
${mainFileTemplateForComponents}
${statements}

frolicSpecialUpdate model _ = model
frolicSpecialView _ = ${_.trim(_.drop(expression.value.split(' ')).join(' '))}
main =
    beginnerProgram { model = 1 , view = frolicSpecialView , update = frolicSpecialUpdate }
`
  }

  return fileContent
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
  if (expression.type === 'frolicExpression') {
    fileContent = getGeneratedFrolicFileContent(expression, importStatements, statements, userModuleName, counter)
  } else if (expression.type === 'renderExpression') {
    const appProgram = hasSubscribed(expression.value)
      ? 'program'
      : 'beginnerProgram'

    fileContent = `module F${expression.hash} exposing (..)
${mainFileTemplateForComponents}
${statements}
main =
    ${appProgram} ${_.drop(expression.value.split(' ')).join(' ')}`
  } else {
    fileContent = `module F${expression.hash} exposing (..)
import String
${mainFileTemplate}
${statements}
main =
    pre []
        [ text ${getSimpleExpressionChunk(expression)} ]`
  }

  return fileContent
}

let theCache = {}
function notInCache(token) {
  return !cachedSources[token.hash]
}

function writeFilesForExpressions(tokens, playgroundCode, userModuleName, codePath) { // eslint-disable-line no-shadow
  const tokenizedCode = tokenize(playgroundCode)

  const importStatements = tokens.filter(notInCache).filter((token) => token.type === 'importStatement').map((token) => token.value).join('\n')
  const statements = tokens.filter(notInCache).filter((token) => token.type === 'assignment').map((token) => token.value).join('\n')
  const allExpressions = tokens.filter((token) => token.type === 'expression' || token.type === 'renderExpression' || token.type === 'frolicExpression')
  const expressions = allExpressions.filter(notInCache)

  const fileWritePromises = expressions.map((expression, index) => writeFile(`${codePath}/F${expression.hash}.elm`, getGeneratedMainFileContent(expression, importStatements, statements, userModuleName, index)))
  return Promise.all(fileWritePromises).then(() => allExpressions)
}

let cachedCode = ''
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
  if (cachedCode.trim() !== code.trim() || !cachedComponentKeys[getExpressionValue(expressions[index]) + index]) {
    cachedComponentKeys[getExpressionValue(expressions[index]) + index] = `${Math.floor(Math.random() * 10000)}+${index}`
  }

  return cachedComponentKeys[getExpressionValue(expressions[index]) + index]
}

let cachedSources = {} // eslint-disable-line vars-on-top, prefer-const

function getSource(module, expression, index) {
  // console.log(3)
  if(!cachedSources[expression.hash] || true) {
    const fileName = `F${expression.hash}`
    eval(fs.readFileSync(`${codePath}/${fileName}.js`).toString()) // eslint-disable-line no-eval
    cachedSources[expression.hash] = _.cloneDeep(module.exports[_.capitalize(fileName)])
    // console.log('caching expression', expression.value, cachedSources[expression.hash])
  } else {
    console.log('feed source from cache', expression.value, cachedSources[expression.hash])
  }

  return cachedSources[expression.hash]
}

let elmMakePromises = Promise.resolve()

/*
   * tokenize
   * create md5 keys for each token (based on expression value + file name)
   * store md5's current request in an array (for ordering the expressions. order of expression -> order of output in preview window)
   * name of the generated elm files would be - `F${md5OfTheToken}`
   * write user code to a file - weird place to put this. does not fit in the flow
   * before writing the elm file and using elm-make, check cache (cachedCompiledCode[md5OfTheToken])
   * if (foundInCache) { doNothing }
   * else {
   *   write elm file,
   *   use elm-make to generate .js file
   *   store the compiled code (.js file content) in the cache
   * }
   * now eval the compiled code for each playgroud expression
   * return elm-react components (key would be same as the generated md5 hashes! profit!)
   */
export function compile(code, playgroundCode='', openFilePath) {
  elmMakePromises.cancel()
  // get folder path from file path
  const openFileFolderPath = openFilePath
    ? _.initial(openFilePath.split('/')).join('/')
    : null

  const tokens = tokenize(playgroundCode.trim())
  const tokensWithHashes = tokens.map((token) => ({
      ...token,
      hash: createHash(openFilePath || '', token)
  }))

  // return updateFileSources(openFileFolderPath)
  //         .then(writeCodeToFile.bind(null, code))
  //         .then((userModuleName) => writeFilesForExpressions(tokensWithHashes, playgroundCode.trim(), userModuleName, codePath))

  return updateFileSources(openFileFolderPath)
          .then(() => writeCodeToFile(code))
          .then((userModuleName) => writeFilesForExpressions(tokensWithHashes, playgroundCode.trim(), userModuleName, codePath))
          .then((expressions) => { // eslint-disable-line arrow-body-style
            return new Promise(() => {
              const allPromises = expressions.filter(notInCache).map((expression, index) => {
                const fileName = `F${expression.hash}`
                return promisifiedExec(`cd ${codePath} && elm-make --yes ${fileName}.elm --output=${fileName}.js`)
              })

              // console.log(1)
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
                    // console.log(2, expressions)
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
