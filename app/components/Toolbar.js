import React, { Component } from 'react'
import styles from './Toolbar.css'

const editorThemes = [
    {id: 'ambiance', name: 'ambiance'},
    {id: 'chrome', name: 'chrome'},
    {id: 'dawn', name: 'dawn'},
    {id: 'github', name: 'github'},
    {id: 'merbivore', name: 'merbivore'},
    {id: 'cobalt', name: 'cobalt'},
    {id: 'terminal', name: 'terminal'},
    {id: 'twilight', name: 'twilight'},
]

const languages = [
    {id: 'elm', name: 'elm'},
    {id: 'purescript', name: 'purescript'},
]

import openFileIcon from 'url!../images/open-file-16x16.ico'
// import saveFileIcon from 'url!../images/save-icon.png'
import saveFileIcon from 'url!../images/document-save-16x16.ico'

class Toolbar extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className={styles.toolbar}>
                <select
                    value={this.props.editorTheme}
                    onChange={this.props.onEditorThemeChange}
                    >
                    {editorThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                </select>
                <select
                    value={this.props.language}
                    onChange={this.props.onLanguageChange}
                    >
                    {languages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}
                </select>
                <button
                    style={{
                        float: 'right',
                        marginRight: 10
                    }}
                    onClick={this.props.onCompileClick}>
                    Compile
                </button>
                <label
                    style={{
                        float: 'right',
                        paddingRight: 10
                    }}>
                    <input
                    type='checkbox'
                    value='Auto Compile'
                    checked={this.props.autoCompile}
                    onClick={this.props.onAutoCompileFlagChange}
                    />
                    Auto Compile
                </label>
                <img
                    alt='Save File'
                    style={{float: 'right', paddingRight: 10}}
                    src={saveFileIcon}
                    onClick={this.props.onSaveClick}
                    />
                <img
                    alt='Open File'
                    style={{float: 'right', paddingRight: 10}}
                    src={openFileIcon}
                    onClick={this.props.onOpenClick}
                    />
            </div>
        )
    }
}

Toolbar.defaultProps = {
    language: 'purescript'
}

export default Toolbar
