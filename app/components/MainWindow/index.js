import _ from 'lodash'
import Promise from 'bluebird'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'

import SplitPane from 'react-split-pane'
import Error from '../Error/index.js'

import styles from './MainWindow.css'

import brace from 'brace'
import AceEditor from 'react-ace'

import 'brace/ext/language_tools'

import 'brace/mode/elm'
import 'brace/mode/haskell'
import 'brace/mode/javascript'
import 'brace/mode/jsx'

// terminal themes
import 'brace/theme/ambiance'
import 'brace/theme/chrome'
import 'brace/theme/dawn'
import 'brace/theme/github'
import 'brace/theme/merbivore'
import 'brace/theme/cobalt'
import 'brace/theme/terminal'
import 'brace/theme/twilight'

// import vim and emacs key bindings
import 'brace/keybinding/emacs'
import 'brace/keybinding/vim'

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCompilingMessage() {
    const messages = [
        '👷👷',
        '😴😴😴',
        '💅',
        'Here\'s a 🍠',
        'Woof, working hard 🏗',
        'Funcitonal Programming, yo! 😎',
        '!Diversity 🐼',
        // 'Compiling...'
    ]

    return messages[getRandomInt(0, messages.length - 1)]
}

export default class MainWindow extends Component {
    constructor(props) {
        super(props)

        this.editorCommands = this.editorCommands.bind(this)
        this.getOutput = this.getOutput.bind(this)
    }

    componentDidMount() {
        this.focusEditor()
    }

    componentWillReceiveProps(nextProps) {
        if(this.props.keyboardHandler !== nextProps.keyboardHandler) {
            if(this._codeEditor && this._playgroundEditor) {
                this._codeEditor.setKeyboardHandler('ace/keyboard/' + nextProps.keyboardHandler);
                this._playgroundEditor.setKeyboardHandler('ace/keyboard/' + nextProps.keyboardHandler);
            }
        }
    }

    focusEditor() {
        if(this._codeEditor) {
            this._codeEditor.focus()
        }
    }

    editorCommands() {
        return [
            {
                name: "Preferences shortcut",
                exec: this.props.onPreferencesClick,
                bindKey: {mac: "cmd-,", win: "ctrl-,"}
            }
        ]
    }

    getOutput() {
        if(React.isValidElement(this.props.output) || _.isString(this.props.output)) {
            return this.props.output
        } else {
            return <Error error={new Error('output is not a valid react element')} />
        }
    }

    render() {
        return (
            <div className={styles['main-window']}>
                <SplitPane split='vertical' defaultSize={this.props.showCodePanel ? '33%' : 0}>
                    {this.props.showCodePanel ?
                        <div
                            className={styles.column}
                            >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: 15,
                                height: 50
                            }}>
                                <img
                                    src={require('file!../../images/code-funnel.svg')}
                                    title='Code'
                                    alt='Code'
                                    style={{width: 16, height: 16}}/>
                            </div>
                            <AceEditor
                                ref={(node) => {
                                    if(node) {
                                        this._codeEditor = node.editor
                                    }
                                }}
                                fontSize={this.props.fontSize}
                                tabSize={this.props.tabSize}
                                keyboardHandler={this.props.keyboardHandler}
                                scrollPastEnd={true}
                                enableBasicAutocompletion={true}
                                enableLiveAutocompletion={true}
                                height={(this.props.editorHeight) + 'px'}
                                mode={this.props.editorMode}
                                theme={this.props.editorTheme}
                                showGutter={true}
                                value={this.props.code}
                                className="container-code"
                                onChange={this.props.onCodeChange}
                                name="definitions"
                                width='100%'
                                editorProps={{$blockScrolling: Infinity}}
                                commands={this.editorCommands()}
                                />
                        </div>
                        : <span></span>
                    }
                    <SplitPane
                        split='vertical'
                        defaultSize={this.props.showPlaygroundPanel && this.props.showOutputPanel ? '50%' : (this.props.showPlaygroundPanel ? '100%' : '0%')}
                        >
                        {this.props.showPlaygroundPanel ?
                            <div className={styles.column}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: 15,
                                    height: 50
                                }}>
                                    <img
                                        src={require('file!../../images/lab-flask.svg')}
                                        title='Playground'
                                        alt='Playground'
                                        style={{width: 16, height: 16}}/>
                                    <img
                                        src={require('url!../../images/document-save-16x16.ico')}
                                        style={{cursor: 'pointer'}}
                                        title='Save Playground'
                                        alt='Save Playground'
                                        onClick={this.props.onSavePlaygroundClick}
                                        />
                                </div>
                                <AceEditor
                                    ref={(node) => {
                                        if(node) {
                                            this._playgroundEditor = node.editor
                                        }
                                    }}
                                    fontSize={this.props.fontSize}
                                    tabSize={this.props.tabSize}
                                    keyboardHandler={this.props.keyboardHandler}
                                    scrollPastEnd={true}
                                    enableBasicAutocompletion={true}
                                    enableLiveAutocompletion={true}
                                    height={(this.props.editorHeight) + 'px'}
                                    value={this.props.playgroundCode}
                                    theme={this.props.editorTheme}
                                    showGutter={true}
                                    className="container-playground-code"
                                    mode={this.props.editorMode}
                                    onChange={this.props.onPlaygroundCodeChange}
                                    name="playground_function_calls"
                                    width='100%'
                                    editorProps={{$blockScrolling: Infinity}}
                                    commands={this.editorCommands()}
                                />
                            </div>
                            : null
                        }
                        {this.props.showOutputPanel ?
                            <div className={styles.column}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: 15,
                                    height: 50,
                                }}>
                                    <img
                                        src={require('file!../../images/headphone-output.svg')}
                                        title='Output'
                                        alt='Output'
                                        style={{width: 16, height: 16}}/>
                                    {this.props.compiling ? <div style={{verticalAlign: 'middle'}}>{getCompilingMessage()}</div> : null}
                                </div>
                                <div style={{
                                        fontSize: this.props.fontSize,
                                        height: (this.props.editorHeight - 50),
                                        overflow: 'auto',
                                        backgroundColor: 'black'}}>
                                    {this.getOutput()}
                                </div>
                            </div>
                            : null
                        }
                    </SplitPane>
                </SplitPane>
            </div>
        )
    }
}
