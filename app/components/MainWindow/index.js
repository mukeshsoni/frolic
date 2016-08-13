import _ from 'lodash'
import Promise from 'bluebird'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'

import SplitPane from 'react-split-pane'

import styles from './MainWindow.css'

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

export default class Home extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        this.focusEditor()
    }

    focusEditor() {
        if(this._codeEditor) {
            this._codeEditor.focus()
        }
    }


    render() {
        return (
            <div className={styles['main-window']}>
                <SplitPane split='vertical' defaultSize={this.props.showCodePanel ? '33%' : 0}>
                    {this.props.showCodePanel ?
                        <div className={styles.column}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: 10
                            }}>
                                <img src={require('file!../../images/code-funnel.svg')} style={{width: 16, height: 16}}/>
                            </div>
                            <AceEditor
                                ref={(node) => {
                                    if(node) {
                                        this._codeEditor = node.editor
                                    }
                                }}
                                scrollPastEnd={true}
                                enableBasicAutocompletion={true}
                                enableLiveAutocompletion={true}
                                height={this.props.editorHeight + 'px'}
                                mode={this.props.editorMode}
                                theme={this.props.editorTheme}
                                showGutter={true}
                                value={this.props.code}
                                className="container-code"
                                onChange={this.props.onCodeChange}
                                name="definitions"
                                width='100%'
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
                                    padding: 10
                                }}>
                                    <img src={require('file!../../images/lab-flask.svg')} style={{width: 16, height: 16}}/>
                                    <img
                                        src={require('url!../../images/document-save-16x16.ico')}
                                        style={{cursor: 'pointer'}}
                                        onClick={this.props.onSavePlaygroundClick}
                                        />
                                </div>
                                <AceEditor
                                    scrollPastEnd={true}
                                    enableBasicAutocompletion={true}
                                    enableLiveAutocompletion={true}
                                    height={this.props.editorHeight + 'px'}
                                    value={this.props.playgroundCode}
                                    theme={this.props.editorTheme}
                                    showGutter={true}
                                    className="container-playground-code"
                                    mode={this.props.editorMode}
                                    onChange={this.props.onPlaygroundCodeChange}
                                    name="playground_function_calls"
                                    width='100%'
                                />
                            </div>
                            : null
                        }
                        {this.props.showOutputPanel ?
                            <div className={styles.column}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: 10
                                }}>
                                    <img src={require('file!../../images/headphone-output.svg')} style={{width: 16, height: 16}}/>
                                </div>
                                <div style={{fontSize: 12, height: this.props.editorHeight, backgroundColor: 'black'}}>
                                    {this.props.output}
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
