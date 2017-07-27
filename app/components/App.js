import _ from 'lodash'
import Promise from 'bluebird'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'

// import Mousetrap from 'mousetrap'
const fs = require('fs')
const readFile = Promise.promisify(fs.readFile)
const fileAccess = Promise.promisify(fs.access)

const storage = require('electron-json-storage')
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
import ErrorComponent from './Error/index.js'

// const compilers = ['elm', 'react', 'purescript']
const compilers = {
    elm: require('../compilers/elm-compiler'), // eslint-disable-line global-require
    // react: require('../compilers/react-compiler'), // eslint-disable-line global-require
    purescript: require('../compilers/purescript-compiler') // eslint-disable-line global-require
}

import { ipcRenderer } from 'electron'
const defaultLanguage = 'purescript'
let cachedPlaygroundCode = {}

function getFileNameWithoutExtension(fileName) {
    if (fileName.indexOf('.') >= 0) {
        return _.initial(fileName.split('.')).join('.')
    } else {
        return fileName // no extension in the file name
    }
}

function getPlaygroundFilePath(codeFilePath, playgroundFilePath) {
    if (playgroundFilePath) {
        return playgroundFilePath
    }

    if (!codeFilePath) {
        return null
    }

    const codeFileName = _.last(codeFilePath.split('/'))
    const codeFileFolderPath = _.initial(codeFilePath.split('/')).join('/')
    return `${codeFileFolderPath}/${getFileNameWithoutExtension(
        codeFileName
    )}.frolic`
}

const editorPrefsDefaults = {
    fontSize: 14,
    tabSize: 4,
    keyboardHandler: 'ace',
    editorTheme: 'terminal',
    formatOnSave: true,
    autoCompile: true,
    compileOnSave: true
}

function savePreferences(preferences) {
    return setToStorage('preferences', preferences)
        .then(() => console.log('preferences stored', preferences)) // eslint-disable-line no-console
        .catch(err => console.log('error saving preferences', err)) // eslint-disable-line no-console
}

function getSavedPreferences() {
    return getFromStorage('preferences').then(preferences =>
        _.defaults(preferences, editorPrefsDefaults)
    )
}

export default class App extends Component {
    constructor(props) {
        super(props)

        this.handleCodeChange = this.handleCodeChange.bind(this)
        this.handlePlaygroundCodeChange = this.handlePlaygroundCodeChange.bind(
            this
        )
        this.compile = _.debounce(this.compile.bind(this), 1000)

        this.handleLanguageChange = this.handleLanguageChange.bind(this)
        this.handleEditorThemeChange = this.handleEditorThemeChange.bind(this)
        this.handleFontSizeChange = this.handleFontSizeChange.bind(this)
        this.handleTabSizeChange = this.handleTabSizeChange.bind(this)
        this.handleAutoCompileFlagChange = this.handleAutoCompileFlagChange.bind(
            this
        )
        this.handleFileOpenClick = _.debounce(
            this.handleFileOpenClick.bind(this),
            500
        )
        this.handleFileSaveClick = _.debounce(
            this.handleFileSaveClick.bind(this),
            500
        )
        this.handleNewFileClick = _.debounce(
            this.handleNewFileClick.bind(this),
            500
        )
        this.handleSavePlaygroundClick = _.debounce(
            this.handleSavePlaygroundClick.bind(this),
            500
        )
        this.toggleCodePanelVisibility = this.toggleCodePanelVisibility.bind(
            this
        )
        this.togglePlaygroundPanelVisibility = this.togglePlaygroundPanelVisibility.bind(
            this
        )
        this.toggleOutputPanelVisibility = this.toggleOutputPanelVisibility.bind(
            this
        )
        this.loadFileFromHistory = this.loadFileFromHistory.bind(this)
        this.handleWindowResize = _.debounce(
            this.handleWindowResize.bind(this),
            300
        )
        this.loadPlaygroundFile = this.loadPlaygroundFile.bind(this)
        this.openPlaygroundFile = this.openPlaygroundFile.bind(this)
        this.handleGenerateTestClick = this.handleGenerateTestClick.bind(this)
        this.handleSettingsClose = this.handleSettingsClose.bind(this)
        this.handleKeyboardHandlerChange = this.handleKeyboardHandlerChange.bind(
            this
        )
        this.handleFormatOnSaveChange = this.handleFormatOnSaveChange.bind(this)
        this.handleCompileOnSaveChange = this.handleCompileOnSaveChange.bind(
            this
        )
        this.savePreferences = this.savePreferences.bind(this)
        this.handleShowPreferences = this.handleShowPreferences.bind(this)
        this.handleOutput = this.handleOutput.bind(this)

        // var compiler = require('../compilers/' + defaultLanguage + '-compiler/index.js').compiler()
        const compiler = compilers[defaultLanguage].compiler()

        this.state = {
            code: compiler.sampleCode || '',
            playgroundCode: compiler.samplePlaygroundCode || '',
            output: '',
            compiling: false,
            language: defaultLanguage,
            compiler,
            autoCompile: true,
            openFilePath: null,
            showCodePanel: true,
            showPlaygroundPanel: true,
            showOutputPanel: true,
            editorTheme: 'terminal',
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
            if (!message || !message.action) {
                return
            }

            switch (message.action) {
                case 'newFile':
                    this.handleNewFileClick()
                    break
                case 'openFile':
                    this.handleFileOpenClick()
                    break
                case 'openPlaygroundFile':
                    this.openPlaygroundFile()
                    break
                case 'saveFile':
                    this.handleFileSaveClick()
                    break
                case 'savePlaygroundFile':
                    this.handleSavePlaygroundClick()
                    break
                case 'generateTests':
                    this.handleGenerateTestClick()
                    break
                case 'showPreferences':
                    this.handleShowPreferences()
                    break
                default:
                    console.log(
                        "don't understand the menu action",
                        message.action
                    ) // eslint-disable-line no-console
            }
        })

        getSavedPreferences().then(preferences =>
            this.setState({
                ...preferences
            })
        )
    }

    componentDidMount() {
        this.state.compiler.outputStream.subscribe(this.handleOutput)
        window.onresize = this.handleWindowResize
        this.handleWindowResize()

        if (this.state.autoCompile) {
            this.state.compiler.onCodeChange(
                this.state.code,
                this.state.onPlaygroundCodeChange,
                this.state.openFilePath
            )
        }
    }

    componentWillUnmount() {
        this.storeFilePathInDb()
        this.state.compiler.cleanUp()
    }

    getCodePath() {
        if (this.state.openFilePath) {
            return this.state.openFilePath
        } else {
            return 'makarana_playground'
        }
    }

    handleWindowResize() {
        this.setState({ editorHeight: this.mainWindow.clientHeight })
    }

    handleOutput(output) {
        this.setState({ output, compiling: false })
    }

    loadFileFromHistory() {
        getFromStorage('fileData').then(file => {
            if (file.filePath) {
                readFile(file.filePath).then(content =>
                    this.setState({ code: content.toString() })
                )
            }
        })
    }

    storeFilePathInDb() {
        return setToStorage('fileData', { filePath: this.state.openFilePath })
            .then(() =>
                console.log('file path stored ', this.state.openFilePath)
            ) // eslint-disable-line no-console
            .catch(err => {
                console.error('error setting filePath', err) // eslint-disable-line no-console
            })
    }

    handleCodeChange(newCode) {
        this.setState(
            {
                code: newCode,
                fileSaved: false
            },
            () => {
                // if it's a file opened from disk, only compile on save
                if (this.state.autoCompile && !this.state.openFilePath) {
                    this.state.compiler.onCodeChange(
                        this.state.code,
                        this.state.playgroundCode,
                        this.state.openFilePath
                    )
                }
            }
        )
    }

    handlePlaygroundCodeChange(newCode) {
        cachedPlaygroundCode[this.getCodePath()] = newCode

        this.setState(
            {
                playgroundCode: newCode
            },
            () => {
                if (this.state.autoCompile) {
                    this.state.compiler.onPlaygroundCodeChange(
                        this.state.code,
                        this.state.playgroundCode,
                        this.state.openFilePath
                    )
                }
            }
        )
    }

    handleLanguageChange(e) {
        this.state.compiler.cleanUp()
        // var compiler = require('../compilers/' + e.target.value + '-compiler/index.js').compiler()
        const compiler = compilers[e.target.value].compiler()

        this.setState(
            {
                language: e.target.value,
                compiler,
                code: compiler.sampleCode || '',
                playgroundCode: compiler.samplePlaygroundCode || ''
            },
            () => {
                this.state.compiler.outputStream.subscribe(this.handleOutput)
            }
        )
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
        return saveFile(
            this.state.code,
            this.state.openFilePath,
            this.state.compiler.extensions
        )
            .then(filePath => {
                if (this.state.formatOnSave && this.state.compiler.formatCode) {
                    this.state.compiler
                        .formatCode(this.state.code)
                        .then(formattedCode => {
                            this.setState(
                                {
                                    code: formattedCode,
                                    openFilePath: filePath,
                                    fileSaved: true
                                },
                                () => {
                                    if (this.state.compileOnSave) {
                                        this.state.compiler.onCodeChange(
                                            this.state.code,
                                            this.state.playgroundCode,
                                            this.state.openFilePath
                                        )
                                    }
                                }
                            )
                        })
                } else {
                    this.setState(
                        { openFilePath: filePath, fileSaved: true },
                        () => {
                            if (this.state.compileOnSave) {
                                this.state.compiler.onCodeChange(
                                    this.state.code,
                                    this.state.playgroundCode,
                                    this.state.openFilePath
                                )
                            }
                        }
                    )
                }
            })
            .catch(err => console.log('error saving file ', err.message)) // eslint-disable-line no-console
    }

    handleGenerateTestClick() {
        if (this.state.compiler.generateTests) {
            this.state.compiler
                .generateTests(
                    this.state.code,
                    this.state.playgroundCode,
                    this.state.openFilePath
                )
                .then(tests => console.log('generated tests', tests)) // eslint-disable-line
        } else {
            alert(
                'This compiler, ' +
                    this.state.language +
                    ', does not support test generation'
            ) // eslint-disable-line
        }
    }

    handleSettingsClose() {
        this.setState({ showSettings: false })
    }

    handleShowPreferences() {
        this.setState({ showSettings: true })
    }

    openPlaygroundFile() {
        return openFile(['frolic'])
            .then(({ filePath, content }) => {
                this.setState(
                    {
                        playgroundCode: content.toString(),
                        playgroundFilePath: filePath
                    },
                    () => {
                        if (this.state.autoCompile) {
                            this.compile()
                        }
                    }
                )
            })
            .catch(err =>
                console.log('error opening playground file', err.message)
            ) // eslint-disable-line no-console
    }

    loadPlaygroundFile(codeFile, playgroundFilePath) {
        if (cachedPlaygroundCode[codeFile.filePath]) {
            return Promise.resolve({
                codeFile,
                playgroundFile: {
                    content: cachedPlaygroundCode[codeFile.filePath],
                    filePath: null
                }
            })
        }

        return fileAccess(
            getPlaygroundFilePath(codeFile.filePath, playgroundFilePath)
        )
            .then(() => {
                if (cachedPlaygroundCode[codeFile.filePath]) {
                    return Promise.resolve({
                        codeFile,
                        playgroundFile: {
                            content: cachedPlaygroundCode[codeFile.filePath],
                            filePath: getPlaygroundFilePath(
                                codeFile.filePath,
                                playgroundFilePath
                            )
                        }
                    })
                } else {
                    return readFile(
                        getPlaygroundFilePath(
                            codeFile.filePath,
                            playgroundFilePath
                        )
                    ).then(content => ({
                        codeFile,
                        playgroundFile: {
                            content: content.toString(),
                            filePath: getPlaygroundFilePath(
                                codeFile.filePath,
                                playgroundFilePath
                            )
                        }
                    }))
                }
            })
            .catch(err => {
                console.log('error reading playground file', err.message) // eslint-disable-line no-console
                if (cachedPlaygroundCode[codeFile.filePath]) {
                    return Promise.resolve({
                        codeFile,
                        playgroundFile: {
                            content: cachedPlaygroundCode[codeFile.filePath],
                            filePath: null
                        }
                    })
                } else {
                    return {
                        codeFile,
                        playgroundFile: {
                            content: '',
                            filePath: null
                        }
                    }
                }
            })
    }

    handleSavePlaygroundClick() {
        saveFile(
            this.state.playgroundCode,
            getPlaygroundFilePath(
                this.state.openFilePath,
                this.state.playgroundFilePath
            ),
            ['frolic'],
            'Save Playground'
        )
            .then(() => this.compile())
            .catch(err => console.log('error saving file ', err.message)) // eslint-disable-line no-console
    }

    compile() {
        this.state.compiler.onCodeChange(
            this.state.code,
            this.state.playgroundCode,
            this.state.openFilePath
        )
    }

    handleFileOpenClick() {
        openFile(this.state.compiler.extensions)
            .then(codeFile => this.loadPlaygroundFile(codeFile, null))
            .then(({ codeFile, playgroundFile }) => {
                this.setState(
                    {
                        openFilePath: codeFile.filePath,
                        code: codeFile.content,
                        playgroundCode: playgroundFile.content,
                        playgroundFilePath: playgroundFile.filePath,
                        fileSaved: true
                    },
                    () => {
                        this.storeFilePathInDb()
                        if (this.state.compiler.onNewFileLoad) {
                            this.state.compiler.onNewFileLoad(
                                this.state.openFilePath
                            )
                        }

                        if (this.state.autoCompile) {
                            this.compile()
                        }
                    }
                )
            })
            .catch(err => {
                console.log('error opening file ', err.toString()) // eslint-disable-line no-console
            })
    }

    handleAutoCompileFlagChange(e) {
        this.setState(
            {
                autoCompile: e.target.checked
            },
            this.savePreferences
        )
    }

    savePreferences() {
        savePreferences(_.pick(this.state, Object.keys(editorPrefsDefaults)))
    }

    handleEditorThemeChange(e) {
        this.setState(
            {
                editorTheme: e.target.value
            },
            this.savePreferences
        )
    }

    handleFontSizeChange(e) {
        this.setState(
            {
                fontSize: parseInt(e.target.value, 10)
            },
            this.savePreferences
        )
    }

    handleTabSizeChange(e) {
        this.setState(
            {
                tabSize: parseInt(e.target.value, 10)
            },
            this.savePreferences
        )
    }

    handleKeyboardHandlerChange(e) {
        this.setState(
            {
                keyboardHandler: e.target.value
            },
            this.savePreferences
        )
    }

    handleFormatOnSaveChange(e) {
        this.setState({ formatOnSave: e.target.checked }, this.savePreferences)
    }

    handleCompileOnSaveChange(e) {
        this.setState({ compileOnSave: e.target.checked })
    }

    toggleCodePanelVisibility(showCodePanel) {
        this.setState({ showCodePanel })
    }

    togglePlaygroundPanelVisibility(showPlaygroundPanel) {
        this.setState({ showPlaygroundPanel })
    }

    toggleOutputPanelVisibility(showOutputPanel) {
        this.setState({ showOutputPanel })
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
                    onPlaygroundPanelVisibilityChange={
                        this.togglePlaygroundPanelVisibility
                    }
                    onOutputPanelVisibilityChange={
                        this.toggleOutputPanelVisibility
                    }
                    showCodePanel={this.state.showCodePanel}
                    showPlaygroundPanel={this.state.showPlaygroundPanel}
                    showOutputPanel={this.state.showOutputPanel}
                    ref={node => {
                        if (node && !this.toolbarDiv) {
                            this.toolbarDiv = ReactDOM.findDOMNode(node)
                        }
                    }}
                />
                <MainWindow
                    ref={node => {
                        if (node) {
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
                    editorMode={this.state.compiler.editorMode}
                    showCodePanel={this.state.showCodePanel}
                    showPlaygroundPanel={this.state.showPlaygroundPanel}
                    showOutputPanel={this.state.showOutputPanel}
                    editorHeight={this.state.editorHeight}
                    editorTheme={this.state.editorTheme}
                    playgroundFilePath={getPlaygroundFilePath(
                        this.state.openFilePath,
                        this.state.playgroundFilePath
                    )}
                    onPreferencesClick={this.handleShowPreferences}
                />
                <Footer
                    fileSaved={this.state.fileSaved}
                    openFilePath={this.state.openFilePath}
                    ref={node => {
                        if (node && !this.footerDiv) {
                            this.footerDiv = ReactDOM.findDOMNode(node)
                        }
                    }}
                />{' '}
                {this.state.showSettings
                    ? <Settings
                          onClose={this.handleSettingsClose}
                          editorTheme={this.state.editorTheme}
                          onEditorThemeChange={this.handleEditorThemeChange}
                          fontSize={this.state.fontSize}
                          onFontSizeChange={this.handleFontSizeChange}
                          tabSize={this.state.tabSize}
                          onTabSizeChange={this.handleTabSizeChange}
                          keyboardHandler={this.state.keyboardHandler}
                          onKeyboardHandlerChange={
                              this.handleKeyboardHandlerChange
                          }
                          formatOnSave={this.state.formatOnSave}
                          onFormatOnSaveChange={this.handleFormatOnSaveChange}
                          compileOnSave={this.state.compileOnSave}
                          onCompileOnSaveChange={this.handleCompileOnSaveChange}
                      />
                    : null}
            </div>
        )
    }
}
