import _ from 'lodash'
import Promise from 'bluebird'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Mousetrap from 'mousetrap'

import SplitPane from 'react-split-pane'

import styles from './Home.css'

// our components
import Toolbar from './Toolbar.js'

import brace from 'brace'
import AceEditor from 'react-ace'

import 'brace/ext/language_tools'

import 'brace/mode/elm'
import 'brace/mode/haskell'

// terminal themes
import 'brace/theme/ambiance'
import 'brace/theme/chrome'
import 'brace/theme/dawn'
import 'brace/theme/github'
import 'brace/theme/merbivore'
import 'brace/theme/cobalt'
import 'brace/theme/terminal'
import 'brace/theme/twilight'

const storage = require('electron-json-storage');
const getFromStorage = Promise.promisify(storage.get)
const setToStorage = Promise.promisify(storage.set)

var exec = require('child_process').exec;
var fs = require('fs')
var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)

const keyboardShortcuts = ['command+s', 'ctrl+s', 'ctrl+o', 'command+o']
const SPACE = ' '
// utils
import { saveFile, openFile } from '../utils/fileops.js'

export default class Home extends Component {
    constructor(props) {
        super(props)

        this.handleCodeChange = this.handleCodeChange.bind(this)
        this.handlePlaygroundCodeChange = this.handlePlaygroundCodeChange.bind(this)
        this.handleEditorThemeChange = this.handleEditorThemeChange.bind(this)
        this.handleAutoCompileFlagChange = this.handleAutoCompileFlagChange.bind(this)
        this.handleKeyboardEvents = this.handleKeyboardEvents.bind(this)
        this.handleFileOpenClick = _.debounce(this.handleFileOpenClick.bind(this), 500)
        this.handleFileSaveClick = _.debounce(this.handleFileSaveClick.bind(this), 500)
        this.handleWindowResize = _.debounce(this.handleWindowResize.bind(this), 300)
        this.editorCommands = this.editorCommands.bind(this)
        this.compile = _.debounce(this.compile.bind(this), 500)
        this.storeFilePathInDb = this.storeFilePathInDb.bind(this)
        this.loadFileFromHistory = this.loadFileFromHistory.bind(this)

        this.state = {
            code: 'add x y = x + y',
            playgroundCode: 'add 2 3',
            output: '',
            editorTheme: 'terminal',
            autoCompile: true,
            openFilePath: null,
            editorHeight: 1000
        }
    }

    componentWillUnmount() {
        Mousetrap.unbind(keyboardShortcuts)

        this.storeFilePathInDb()
    }

    componentDidMount() {
        Mousetrap.bind(keyboardShortcuts, this.handleKeyboardEvents)
        window.onresize = this.handleWindowResize
        this.handleWindowResize()
        this.focusEditor()
        this.compile()
    }

    storeFilePathInDb() {
        setToStorage('fileData', {filePath: this.state.openFilePath})
                .then(() => console.log('file path stored ', this.state.openFilePath))
                .catch((err) => {
                    console.log('error setting filePath', err)
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


    focusEditor() {
        if(this._codeEditor) {
            this._codeEditor.focus()
        }
    }

    handleWindowResize() {
        this.setState({
            editorHeight: window.innerHeight - this.toolbarDiv.clientHeight - this.footerDiv.clientHeight - 80
        })
    }

    handleKeyboardEvents(e, combo) {
        switch(combo) {
            case 'ctrl+s':
            case 'command+s':
                console.log('save the file')
                this.handleFileSaveClick()
                break
            case 'ctrl+o':
            case 'command+o':
                console.log('open a file')
                this.handleFileOpenClick()
                break
            default:
                console.log('keyboard event ', combo)
        }
    }

    compile() {
        this.props.compile(this.state.code, this.state.playgroundCode)
                    .then((output) => this.setState({output}))
                    .catch((output) => this.setState({output}))
    }

    handleCodeChange(newCode) {
        this.setState({
            code: newCode,
            fileSaved: false
        })

        if(this.state.autoCompile) {
            this.compile()
        }
    }

    handlePlaygroundCodeChange(newCode) {
        this.setState({
            playgroundCode: newCode
        })

        if(this.state.autoCompile) {
            this.compile()
        }
    }

    handleEditorThemeChange(e) {
        this.setState({editorTheme: e.target.value})
    }

    handleAutoCompileFlagChange(e) {
        this.setState({autoCompile: e.target.checked})
    }

    handleFileSaveClick() {
        // the file has not yet been saved nor been loaded from some path
        if(!this.state.openFilePath) {
            saveFile(this.state.code, './temp/code.js')
                .then((filePath) => {
                    this.setState({
                        openFilePath: filePath,
                        fileSaved: true
                    })
                })
                .catch((err) => console.log('error saving file ', err.message))
        } else {
            writeFile(this.state.openFilePath, this.state.code)
                .then(() => {
                    // alert('File saved!')
                    this.setState({
                        fileSaved: true
                    })
                })
                .catch((err) => alert('Error saving file ', err.toString()))
        }
    }

    handleFileOpenClick() {
        openFile()
            .then((file) => {
                this.setState({
                    openFilePath: file.filePath,
                    code: file.content,
                    fileSaved: true
                }, this.storeFilePathInDb)
            })
            .catch((err) => {
                console.log('error opening file ', err.toString())
            })
    }

    editorCommands() {
        return [
            {
                name: "key_handler_file_open",
                exec: this.handleFileOpenClick,
                bindKey: {mac: "cmd-o", win: "ctrl-o"}
            },
            {
                name: "key_handler_file_save",
                exec: this.handleFileSaveClick,
                bindKey: {mac: "cmd-s", win: "ctrl-s"}
            },

        ]
    }

    render() {
        return (
            <div className={styles['root-container']}>
                <Toolbar
                    editorTheme={this.state.editorTheme}
                    onEditorThemeChange={this.handleEditorThemeChange}
                    language={this.props.language}
                    onLanguageChange={this.props.onLanguageChange}
                    onCompileClick={this.compile}
                    onOpenClick={this.handleFileOpenClick}
                    onSaveClick={this.handleFileSaveClick}
                    fileSaved={this.state.fileSaved}
                    autoCompile={this.state.autoCompile}
                    onAutoCompileFlagChange={this.handleAutoCompileFlagChange}
                    ref={(node) => {
                        if(node && !this.toolbarDiv) {
                            this.toolbarDiv = ReactDOM.findDOMNode(node)
                        }
                    }}
                />
                <hr/>
                <SplitPane split='vertical' defaultSize='33%'>
                    <div className={styles.column}>
                        <h3>Code goes here</h3>
                        <AceEditor
                            ref={(node) => {
                                if(node) {
                                    this._codeEditor = node.editor
                                }
                            }}
                            enableBasicAutocompletion={true}
                            enableLiveAutocompletion={true}
                            height={this.state.editorHeight + 'px'}
                            mode={this.props.editorMode}
                            theme={this.state.editorTheme}
                            showGutter={true}
                            value={this.state.code}
                            className="container-code"
                            onChange={this.handleCodeChange}
                            name="definitions"
                            commands={this.editorCommands()}
                            width='100%'
                            />
                    </div>
                    <SplitPane split='vertical' defaultSize='50%'>
                        <div className={styles.column}>
                            <h3>Playground</h3>
                            <AceEditor
                                enableBasicAutocompletion={true}
                                enableLiveAutocompletion={true}
                                height={this.state.editorHeight + 'px'}
                                value={this.state.playgroundCode}
                                theme={this.state.editorTheme}
                                showGutter={true}
                                className="container-playground-code"
                                mode={this.props.editorMode}
                                onChange={this.handlePlaygroundCodeChange}
                                name="playground_function_calls"
                                commands={this.editorCommands()}
                                width='100%'
                            />
                        </div>
                        <div className={styles.column}>
                            <h3>Magic</h3>
                            <div style={{fontSize: 12, height: this.state.editorHeight, backgroundColor: 'black'}}>
                                {this.state.output}
                            </div>
                        </div>
                    </SplitPane>
                </SplitPane>
                <div
                    className={styles.footer}
                    ref={(node) => {
                        if(node && !this.footerDiv) {
                            this.footerDiv = ReactDOM.findDOMNode(node)
                        }
                    }}
                    >
                    {this.state.openFilePath}
                    <div style={{float: 'right'}}>
                        {SPACE}{SPACE}{SPACE}
                        {this.state.fileSaved ? 'File saved' : 'File not saved'}
                    </div>
                </div>
            </div>
        )
    }
}
