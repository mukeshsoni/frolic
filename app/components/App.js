import _ from 'lodash'
import Promise from 'bluebird'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
// import Mousetrap from 'mousetrap'
var fs = require('fs')
var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)
var fileAccess = Promise.promisify(fs.access)

const storage = require('electron-json-storage');
const getFromStorage = Promise.promisify(storage.get)
const setToStorage = Promise.promisify(storage.set)

// utils
import { saveFile, openFile } from '../utils/fileops.js'

import styles from './AppStyles.css'
// our components
import Settings from './Settings/index.js'
import Toolbar from './Toolbar/index.js'
import MainWindow from './MainWindow/index.js'
import Footer from './Footer/index.js'
import { compiler as elmCompiler } from '../compilers/elm/elm.js'

const {
    compile: compileElm,
    cleanUp: cleanUpElm,
    onNewFileLoad: onNewFileLoadElm,
    formatCode: formatCodeElm,
    generateTests: generateTestsElm } = elmCompiler()

import { compiler as reactCompiler } from '../compilers/react/react.js'
const {
    compile: compileReact,
    cleanUp: cleanUpReact,
    onNewFileLoad: onNewFileLoadReact,
    formatCode: formatCodeReact,
    generateTests: generateTestsReact } = reactCompiler()

import { compiler as purescriptCompiler } from '../compilers/purescript/purescript.js'
const { compile: compilePurescript, cleanUp: cleanUpPurescript } = purescriptCompiler()

import {ipcRenderer} from 'electron'

const compilers = {
    elm: {
        compile: compileElm,
        cleanUp: cleanUpElm,
        formatCode: formatCodeElm,
        onNewFileLoad: onNewFileLoadElm,
        editorMode: 'elm',
        generateTests: generateTestsElm,
    },
    purescript: {
        compile: compilePurescript,
        cleanUp: cleanUpPurescript,
        editorMode: 'haskell',
    },
    react: {
        compile: compileReact,
        cleanUp: cleanUpReact,
        formatCode: formatCodeReact,
        onNewFileLoad: onNewFileLoadReact,
        editorMode: 'javascript',
        generateTests: generateTestsReact,
    },
}

function getFileNameWithoutExtension(fileName) {
    if(fileName.indexOf('.') >= 0) {
        return _.initial(fileName.split('.')).join('.')
    } else {
        return fileName // no extension in the file name
    }
}

function getPlaygroundFilePath(codeFilePath, playgroundFilePath) {
    if(playgroundFilePath) {
        return playgroundFilePath
    }

    if(!codeFilePath) {
        return null
    }

    const codeFileName = _.last(codeFilePath.split('/'))
    const codeFileFolderPath = _.initial(codeFilePath.split('/')).join('/')
    return codeFileFolderPath + '/' + getFileNameWithoutExtension(codeFileName) + '.frolic'
}

const editorPrefsDefaults = {
    fontSize: 14,
    tabSize: 4,
    keyboardHandler: 'ace',
    editorTheme: 'terminal',
    formatOnSave: true
}

function savePreferences(preferences) {
    setToStorage('preferences', preferences)
        .then(() => console.log('preferences stored', preferences))
        .catch(err => console.log('error saving preferences', err))
}

function getSavedPreferences() {
    return getFromStorage('preferences')
            .then(preferences => _.defaults(preferences, editorPrefsDefaults))
}

export default class App extends Component {
    constructor(props) {
        super(props)


        this.handleCodeChange = this.handleCodeChange.bind(this)
        this.handlePlaygroundCodeChange = this.handlePlaygroundCodeChange.bind(this)
        this.compile = _.debounce(this.compile.bind(this), 1000)

        this.handleLanguageChange = this.handleLanguageChange.bind(this)
        this.handleEditorThemeChange = this.handleEditorThemeChange.bind(this)
        this.handleFontSizeChange = this.handleFontSizeChange.bind(this)
        this.handleTabSizeChange = this.handleTabSizeChange.bind(this)
        this.handleAutoCompileFlagChange = this.handleAutoCompileFlagChange.bind(this)
        this.handleFileOpenClick = _.debounce(this.handleFileOpenClick.bind(this), 500)
        this.handleFileSaveClick = _.debounce(this.handleFileSaveClick.bind(this), 500)
        this.handleNewFileClick = _.debounce(this.handleNewFileClick.bind(this), 500)
        this.handleSavePlaygroundClick = _.debounce(this.handleSavePlaygroundClick.bind(this), 500)
        this.toggleCodePanelVisibility = this.toggleCodePanelVisibility.bind(this)
        this.togglePlaygroundPanelVisibility = this.togglePlaygroundPanelVisibility.bind(this)
        this.toggleOutputPanelVisibility = this.toggleOutputPanelVisibility.bind(this)
        this.loadFileFromHistory = this.loadFileFromHistory.bind(this)
        this.handleWindowResize = _.debounce(this.handleWindowResize.bind(this), 300)
        this.loadPlaygroundFile = this.loadPlaygroundFile.bind(this)
        this.openPlaygroundFile = this.openPlaygroundFile.bind(this)
        this.handleGenerateTestClick = this.handleGenerateTestClick.bind(this)
        this.handleSettingsClose = this.handleSettingsClose.bind(this)
        this.handleKeyboardHandlerChange = this.handleKeyboardHandlerChange.bind(this)
        this.handleFormatOnSaveChange = this.handleFormatOnSaveChange.bind(this)
        this.savePreferences = this.savePreferences.bind(this)
        this.handleShowPreferences = this.handleShowPreferences.bind(this)

        this.state = {
            code: 'add x y = x + y',
            playgroundCode: 'add 2 3',
            output: '',
            compiling: false,
            language: 'react',
            autoCompile: true,
            openFilePath: null,
            showCodePanel: true,
            showPlaygroundPanel: true,
            showOutputPanel: true,
            editorTheme: 'terminal',
            autoCompile: true,
            editorHeight: 1000,
            fontSize: 14,
            tabSize: 4,
            keyboardHandler: 'ace',
            formatOnSave: true,
            showSettings: false
        }
    }

    componentWillMount() {
        ipcRenderer.on('menuActions', (event, message) => {
            if(!message || !message.action) {
                return
            }

            switch(message.action) {
                case 'newFile':
                    this.handleNewFileClick()
                    break;
                case 'openFile':
                    this.handleFileOpenClick()
                    break;
                case 'openPlaygroundFile':
                    this.openPlaygroundFile()
                    break;
                case 'saveFile':
                    this.handleFileSaveClick()
                    break;
                case 'savePlaygroundFile':
                    this.handleSavePlaygroundClick()
                    break;
                case 'generateTests':
                    this.handleGenerateTestClick()
                    break;
                case 'showPreferences':
                    this.handleShowPreferences()
                    break;
                default:
                    console.log('don\'t understand the menu action', message.action)
            }
        })

        getSavedPreferences().then(preferences => this.setState({...preferences}))
    }

    componentDidMount() {
        window.onresize = this.handleWindowResize
        this.handleWindowResize()

        if(this.state.autoCompile) {
            this.compile()
        }
    }

    componentWillUnmount() {
        this.storeFilePathInDb()

        Object.keys(compilers).map((compilerKey) => {
            compilers[compilerKey].cleanUp()
        })
    }

    handleWindowResize() {
        this.setState({
            editorHeight: this.mainWindow.clientHeight
        })
    }

    loadFileFromHistory() {
        getFromStorage('fileData')
                .then((file) => {
                    if(file.filePath) {
                        readFile(file.filePath)
                            .then((content) => this.setState({code: content.toString()}))
                    }
                })
    }

    storeFilePathInDb() {
        return setToStorage('fileData', {filePath: this.state.openFilePath})
                .then(() => console.log('file path stored ', this.state.openFilePath))
                .catch((err) => {
                    console.log('error setting filePath', err)
                })
    }

    compile() {
        this.setState({
            compiling: true,
        }, () => {
            compilers[this.state.language]
                .compile(this.state.code, this.state.playgroundCode, this.state.openFilePath)
                .then((output) => {
                    console.log('output', output)
                    this.setState({output, compiling: false})
                })
                .catch((output) => this.setState({output, compiling: false}))
        })
    }

    handleCodeChange(newCode) {
        this.setState({
            code: newCode,
            fileSaved: false
        }, () => {
            if(this.state.autoCompile) {
                this.compile()
            }
        })
    }

    handlePlaygroundCodeChange(newCode) {
        this.setState({
            playgroundCode: newCode
        }, () => {
            if(this.state.autoCompile) {
                this.compile()
            }
        })
    }

    handleLanguageChange(e) {
        compilers[this.state.language].cleanUp()
        this.setState({language: e.target.value})
    }

    handleNewFileClick() {
        this.setState({
            openFilePath: null,
            playgroundFilePath: null,
            fileSaved: false,
            code: '',
            playgroundCode: ''
        })
    }

    handleFileSaveClick() {
        return saveFile(this.state.code, this.state.openFilePath, ['elm'])
                .then((filePath) => {
                    if(this.state.formatOnSave && compilers[this.state.language].formatCode) {
                        compilers[this.state.language]
                        .formatCode(this.state.code)
                        .then((formattedCode) => {
                            this.setState({
                                code: formattedCode,
                                openFilePath: filePath,
                                fileSaved: true
                            })
                        })
                    } else {
                        this.setState({
                            openFilePath: filePath,
                            fileSaved: true
                        })
                    }
                })
                .catch((err) => console.log('error saving file ', err.message))
    }

    handleGenerateTestClick() {
        if(compilers[this.state.language].generateTests) {
            compilers[this.state.language].generateTests(this.state.code, this.state.playgroundCode, this.state.openFilePath)
                .then((tests) => console.log('generated tests', tests))
        } else {
            alert('This compiler, ' + this.state.language + ', does not support test generation')
        }
    }

    handleSettingsClose() {
        this.setState({showSettings: false})
    }

    handleShowPreferences() {
        this.setState({showSettings: true})
    }

    openPlaygroundFile() {
        openFile(['frolic'])
            .then(({filePath, content}) => {
                this.setState({
                    playgroundCode: content.toString(),
                    playgroundFilePath: filePath,
                }, () => {
                    if(this.state.autoCompile) {
                        this.compile()
                    }
                })
            })
            .catch((err) => console.log('error opening playground file', err.message))
    }

    loadPlaygroundFile(codeFile, playgroundFilePath) {
        return fileAccess(getPlaygroundFilePath(codeFile.filePath, playgroundFilePath))
                .then((content) => {
                    return readFile(getPlaygroundFilePath(codeFile.filePath, playgroundFilePath))
                            .then((content) => {
                                return {
                                    codeFile,
                                    playgroundFile: {content: content.toString(), filePath: getPlaygroundFilePath(codeFile.filePath, playgroundFilePath)},
                                }
                            })
                })
                .catch((err) => {
                    console.log('error reading playground file', err.message)
                    return {codeFile, playgroundFile: {content: '', filePath: null}}
                })
    }

    handleSavePlaygroundClick() {
        saveFile(
            this.state.playgroundCode,
            getPlaygroundFilePath(this.state.openFilePath, this.state.playgroundFilePath),
            ['frolic'],
            'Save Playground')
            .then((filePath) => {
                console.log('playground code saved to', filePath)
            })
            .catch((err) => console.log('error saving file ', err.message))
    }

    handleFileOpenClick() {
        openFile(['elm'])
            .then((codeFile) => this.loadPlaygroundFile(codeFile, null))
            .then(({codeFile, playgroundFile}) => {
                this.setState({
                    openFilePath: codeFile.filePath,
                    code: codeFile.content,
                    playgroundCode: playgroundFile.content,
                    playgroundFilePath: playgroundFile.filePath,
                    fileSaved: true
                }, () => {
                    this.storeFilePathInDb()
                    compilers[this.state.language].onNewFileLoad(this.state.openFilePath)
                    if(this.state.autoCompile) {
                        this.compile()
                    }
                })
            })
            .catch((err) => {
                console.log('error opening file ', err.toString())
            })
    }


    handleAutoCompileFlagChange(e) {
        this.setState({autoCompile: e.target.checked})
    }

    savePreferences() {
        savePreferences(_.pick(this.state, Object.keys(editorPrefsDefaults)))
    }

    handleEditorThemeChange(e) {
        this.setState({editorTheme: e.target.value}, this.savePreferences)
    }

    handleFontSizeChange(e) {
        this.setState({fontSize: parseInt(e.target.value)}, this.savePreferences)
    }

    handleTabSizeChange(e) {
        this.setState({tabSize: parseInt(e.target.value)}, this.savePreferences)
    }

    handleKeyboardHandlerChange(e) {
        this.setState({keyboardHandler: e.target.value}, this.savePreferencesg)
    }

    handleFormatOnSaveChange(e) {
        this.setState({formatOnSave: e.target.checked})
    }

    toggleCodePanelVisibility(showCodePanel) {
        this.setState({showCodePanel})
    }

    togglePlaygroundPanelVisibility(showPlaygroundPanel) {
        this.setState({showPlaygroundPanel})
    }

    toggleOutputPanelVisibility(showOutputPanel) {
        this.setState({showOutputPanel})
    }

    render() {
        return (
            <div className={styles['root-container']}>
                <Toolbar
                    editorTheme={this.state.editorTheme}
                    onEditorThemeChange={this.handleEditorThemeChange}
                    fontSize={this.state.fontSize}
                    onFontSizeChange={this.handleFontSizeChange}
                    language={this.state.language}
                    onLanguageChange={this.handleLanguageChange}
                    onCompileClick={this.compile}
                    onOpenClick={this.handleFileOpenClick}
                    onSaveClick={this.handleFileSaveClick}
                    onNewFileClick={this.handleNewFileClick}
                    fileSaved={this.state.fileSaved}
                    autoCompile={this.state.autoCompile}
                    onAutoCompileFlagChange={this.handleAutoCompileFlagChange}
                    onCodePanelVisibilityChange={this.toggleCodePanelVisibility}
                    onPlaygroundPanelVisibilityChange={this.togglePlaygroundPanelVisibility}
                    onOutputPanelVisibilityChange={this.toggleOutputPanelVisibility}
                    showCodePanel={this.state.showCodePanel}
                    showPlaygroundPanel={this.state.showPlaygroundPanel}
                    showOutputPanel={this.state.showOutputPanel}
                    ref={(node) => {
                        if(node && !this.toolbarDiv) {
                            this.toolbarDiv = ReactDOM.findDOMNode(node)
                        }
                    }}
                />
                <MainWindow
                    ref={(node) => {
                        if(node) {
                            this.mainWindow = ReactDOM.findDOMNode(node)
                        }
                    }}
                    fontSize={this.state.fontSize}
                    tabSize={this.state.tabSize}
                    keyboardHandler={this.state.keyboardHandler}
                    code={this.state.code}
                    playgroundCode={this.state.playgroundCode}
                    output={this.state.output}
                    compiling={this.state.compiling}
                    onCodeChange={this.handleCodeChange}
                    onPlaygroundCodeChange={this.handlePlaygroundCodeChange}
                    onSavePlaygroundClick={this.handleSavePlaygroundClick}
                    editorMode={compilers[this.state.language].editorMode}
                    showCodePanel={this.state.showCodePanel}
                    showPlaygroundPanel={this.state.showPlaygroundPanel}
                    showOutputPanel={this.state.showOutputPanel}
                    editorHeight={this.state.editorHeight}
                    editorTheme={this.state.editorTheme}
                    playgroundFilePath={getPlaygroundFilePath(this.state.openFilePath, this.state.playgroundFilePath)}
                    onPreferencesClick={this.handleShowPreferences}
                    />
                <Footer
                    fileSaved={this.state.fileSaved}
                    openFilePath={this.state.openFilePath}
                    ref={(node) => {
                        if(node && !this.footerDiv) {
                            this.footerDiv = ReactDOM.findDOMNode(node)
                        }
                    }}
                    />
                {this.state.showSettings
                    ?
                    <Settings
                        onClose={this.handleSettingsClose}
                        editorTheme={this.state.editorTheme}
                        onEditorThemeChange={this.handleEditorThemeChange}
                        fontSize={this.state.fontSize}
                        onFontSizeChange={this.handleFontSizeChange}
                        tabSize={this.state.tabSize}
                        onTabSizeChange={this.handleTabSizeChange}
                        keyboardHandler={this.state.keyboardHandler}
                        onKeyboardHandlerChange={this.handleKeyboardHandlerChange}
                        formatOnSave={this.state.formatOnSave}
                        onFormatOnSaveChange={this.handleFormatOnSaveChange}
                        />
                    : null}
            </div>
        )
    }
}
