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
import Toolbar from './Toolbar/index.js'
import MainWindow from './MainWindow/index.js'
import Footer from './Footer/index.js'
import { compiler as elmCompiler } from '../compilers/elm/elm.js'

const { compile: compileElm, cleanUp: cleanUpElm, onNewFileLoad: onNewFileLoadElm } = elmCompiler()

import { compiler as purescriptCompiler } from '../compilers/purescript/purescript.js'
const { compile: compilePurescript, cleanUp: cleanUpPurescript } = purescriptCompiler()

import {ipcRenderer} from 'electron'

const compilers = {
    elm: {
        compile: compileElm,
        cleanUp: cleanUpElm,
        onNewFileLoad: onNewFileLoadElm,
        editorMode: 'elm',
    },
    purescript: {
        compile: compilePurescript,
        cleanUp: cleanUpPurescript,
        editorMode: 'haskell',
    }
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

export default class App extends Component {
    constructor(props) {
        super(props)


        this.handleCodeChange = this.handleCodeChange.bind(this)
        this.handlePlaygroundCodeChange = this.handlePlaygroundCodeChange.bind(this)
        this.compile = _.debounce(this.compile.bind(this), 500)

        this.handleLanguageChange = this.handleLanguageChange.bind(this)
        this.handleEditorThemeChange = this.handleEditorThemeChange.bind(this)
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

        this.state = {
            code: 'add x y = x + y',
            playgroundCode: 'add 2 3',
            output: '',
            language: 'elm',
            autoCompile: true,
            openFilePath: null,
            showCodePanel: true,
            showPlaygroundPanel: true,
            showOutputPanel: true,
            editorTheme: 'terminal',
            autoCompile: true,
            editorHeight: 1000,
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
                default:
                    console.log('don\'t understand the menu action', message.action)
            }
        })
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
            editorHeight: window.innerHeight - this.toolbarDiv.clientHeight - 100
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
        compilers[this.state.language].compile(this.state.code, this.state.playgroundCode, this.state.openFilePath)
                    .then((output) => this.setState({output}))
                    .catch((output) => this.setState({output}))
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

    handleLanguageChange(e) {
        compilers[this.state.language].cleanUp()
        this.setState({language: e.target.value})
    }

    handleNewFileClick() {
        this.setState({
            openFilePath: null,
            fileSaved: false,
            code: '',
        })
    }

    handleFileSaveClick() {
        saveFile(this.state.code, this.state.openFilePath, ['elm'])
            .then((filePath) => {
                this.setState({
                    openFilePath: filePath,
                    fileSaved: true
                })
            })
            .catch((err) => console.log('error saving file ', err.message))
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

    loadPlaygroundFile(codeFile) {
        return fileAccess(getPlaygroundFilePath(codeFile.filePath, this.state.playgroundFilePath))
                .then((content) => {
                    return readFile(getPlaygroundFilePath(codeFile.filePath, this.state.playgroundFilePath))
                            .then((content) => {
                                return {
                                    codeFile,
                                    playgroundCode: content.toString(),
                                }
                            })
                })
                .catch(() => {
                    return {codeFile, playgroundCode: ''}
                })
    }

    handleFileOpenClick() {
        openFile(['elm'])
            .then(this.loadPlaygroundFile)
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

    handleEditorThemeChange(e) {
        this.setState({editorTheme: e.target.value})
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
                    code={this.state.code}
                    playgroundCode={this.state.playgroundCode}
                    output={this.state.output}
                    onCodeChange={this.handleCodeChange}
                    onPlaygroundCodeChange={this.handlePlaygroundCodeChange}
                    onSavePlaygroundClick={this.handleSavePlaygroundClick}
                    editorMode={compilers[this.state.language].editorMode}
                    showCodePanel={this.state.showCodePanel}
                    showPlaygroundPanel={this.state.showPlaygroundPanel}
                    showOutputPanel={this.state.showOutputPanel}
                    editorHeight={this.state.editorHeight}
                    editorTheme={this.state.editorTheme}
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
            </div>
        )
    }
}
