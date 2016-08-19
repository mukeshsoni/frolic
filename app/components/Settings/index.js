import React, { Component } from 'react'
import Modal from 'react-modal'

// import css
import styles from './Settings.css'

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

class Settings extends Component {
    constructor(props)  {
        super(props)
        this.closeModal = this.closeModal.bind(this)
    }

    closeModal() {
        this.props.onClose()
    }

    render() {
        return (
            <div>
                <button onClick={this.openModal}>Open Modal</button>
                <Modal
                    isOpen={true}
                    onRequestClose={this.closeModal}
                    style={{
                        overlay: {
                            zIndex: 1001
                        }
                    }}>
                    <h3>Editor Settings</h3>
                    <div>
                        <label>
                            Theme
                            <select
                                value={this.props.editorTheme}
                                onChange={this.props.onEditorThemeChange}
                                style={{marginLeft: '1em'}}
                                >
                                {editorThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                            </select>
                        </label>
                    </div>
                    <div>
                        <label>
                            Font Size
                            <select
                                value={this.props.fontSize}
                                onChange={this.props.onFontSizeChange}
                                style={{marginLeft: '1em'}}
                                >
                                {fontSizes.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
                            </select>
                        </label>
                    </div>
                    <div>
                        <label>
                            Tab Size
                            <input
                                value={this.props.tabSize}
                                onChange={this.props.onTabSizeChange}
                                typ='text'
                                style={{marginLeft: '1em'}}
                                />
                        </label>
                    </div>
                </Modal>
            </div>
        )
    }
}

export default Settings
