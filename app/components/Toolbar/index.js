import React, { Component } from 'react'
import styles from './Toolbar.css'

// from uikit
import ButtonGroup from '../uikit/buttongroup/index.js'
import Button from '../uikit/button/index.js'

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

const fontSizes = [
    {id: '10', name: '10px'},
    {id: '11', name: '11px'},
    {id: '12', name: '12px'},
    {id: '13', name: '13px'},
    {id: '14', name: '14px'},
    {id: '16', name: '16px'},
    {id: '18', name: '18px'},
    {id: '20', name: '20px'},
    {id: '24', name: '24px'},
]

const languages = [
    {id: 'elm', name: 'elm'},
    {id: 'purescript', name: 'purescript'},
]

class Toolbar extends Component {
    constructor(props) {
        super(props)

        this.toggleCodePanel = this.toggleCodePanel.bind(this)
        this.togglePlaygroundPanel = this.togglePlaygroundPanel.bind(this)
        this.toggleOutputPanel = this.toggleOutputPanel.bind(this)
    }

    toggleCodePanel() {
        if(this.props.onCodePanelVisibilityChange) {
            this.props.onCodePanelVisibilityChange(!this.props.showCodePanel)
        }
    }

    togglePlaygroundPanel() {
        if(this.props.onPlaygroundPanelVisibilityChange) {
            this.props.onPlaygroundPanelVisibilityChange(!this.props.showPlaygroundPanel)
        }
    }

    toggleOutputPanel() {
        if(this.props.onOutputPanelVisibilityChange) {
            this.props.onOutputPanelVisibilityChange(!this.props.showOutputPanel)
        }
    }

    render() {
        return (
            <div className={styles.toolbar}>
                <div className={styles['toolbar-left']}>
                    <select
                        value={this.props.editorTheme}
                        onChange={this.props.onEditorThemeChange}
                        style={{marginRight: '0.5em', fontSize: 20}}
                        >
                        {editorThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                    </select>
                    <select
                        value={this.props.fontSize}
                        onChange={this.props.onFontSizeChange}
                        style={{marginRight: '0.5em', fontSize: 20}}
                        >
                        {fontSizes.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
                    </select>
                    <select
                        value={this.props.language}
                        onChange={this.props.onLanguageChange}
                        style={{fontSize: 20, display: 'none'}}
                        >
                        {languages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}
                    </select>
                </div>
                <div className={styles['toolbar-right']}>
                    <ButtonGroup style={{marginRight: 10}}>
                        <Button
                            active={this.props.showCodePanel}
                            onClick={this.toggleCodePanel}
                            >
                            1
                        </Button>
                        <Button
                            active={this.props.showPlaygroundPanel}
                            onClick={this.togglePlaygroundPanel}
                            >
                            2
                        </Button>
                        <Button
                            active={this.props.showOutputPanel}
                            onClick={this.toggleOutputPanel}
                            >
                            3
                        </Button>
                    </ButtonGroup>
                    <label
                        style={{
                            marginRight: 10
                        }}>
                        <input
                        type='checkbox'
                        value='Auto Compile'
                        checked={this.props.autoCompile}
                        onChange={this.props.onAutoCompileFlagChange}
                        />
                        Auto Compile
                    </label>
                    <Button
                        onClick={this.props.onCompileClick}>
                        Compile
                    </Button>
                </div>
            </div>
        )
    }
}

Toolbar.defaultProps = {
    language: 'purescript'
}

export default Toolbar
