import React, { Component } from 'react'
import Modal from 'react-modal'
import PropTypes from 'proptypes'

// import css
import styles from './Settings.css'


const editorThemes = [
  {
    id: 'ambiance',
    name: 'ambiance'
  }, {
    id: 'chrome',
    name: 'chrome'
  }, {
    id: 'dawn',
    name: 'dawn'
  }, {
    id: 'github',
    name: 'github'
  }, {
    id: 'merbivore',
    name: 'merbivore'
  }, {
    id: 'cobalt',
    name: 'cobalt'
  }, {
    id: 'terminal',
    name: 'terminal'
  }, {
    id: 'twilight',
    name: 'twilight'
  }
]

const fontSizes = [
  {
    id: '10',
    name: '10px'
  }, {
    id: '11',
    name: '11px'
  }, {
    id: '12',
    name: '12px'
  }, {
    id: '13',
    name: '13px'
  }, {
    id: '14',
    name: '14px'
  }, {
    id: '16',
    name: '16px'
  }, {
    id: '18',
    name: '18px'
  }, {
    id: '20',
    name: '20px'
  }, {
    id: '24',
    name: '24px'
  }
]

const keyboardHandlers = [
  {
    id: 'ace',
    name: 'ace'
  }, {
    id: 'vim',
    name: 'vim'
  }, {
    id: 'emacs',
    name: 'emacs'
  }
]

class Settings extends Component {
  constructor(props) {
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
          isOpen
          onRequestClose={this.closeModal}
          style={{
            overlay: {
              zIndex: 1001
            }
          }}
        >
          <h3>Editor Settings</h3>
          <form>
            <ul className={styles['flex-outer']}>
              <li>
                <label>Theme:
                </label>
                <select
                  value={this.props.editorTheme}
                  onChange={this.props.onEditorThemeChange}
                  style={{
                    marginLeft: '1em'
                  }}
                >
                  {editorThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                </select>
              </li>
              <li>
                <label>Font Size:
                </label>
                <select
                  value={this.props.fontSize}
                  onChange={this.props.onFontSizeChange}
                  style={{
                    marginLeft: '1em'
                  }}
                >
                  {fontSizes.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
                </select>
              </li>
              <li>
                <label>Tab Size:
                </label>
                <input
                  value={this.props.tabSize}
                  onChange={this.props.onTabSizeChange}
                  type="text"
                  style={{
                    marginLeft: '1em'
                  }}
                />
              </li>
              <li>
                <label>Key bindings:
                </label>
                <select
                  value={this.props.keyboardHandler}
                  onChange={this.props.onKeyboardHandlerChange}
                  style={{
                    marginLeft: '1em'
                  }}
                >
                  {keyboardHandlers.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                </select>
              </li>
              <li>
                <label>Format on save (uses elm-format):
                </label>
                <input type="checkbox" checked={this.props.formatOnSave} onChange={this.props.onFormatOnSaveChange} />
              </li>
              <li>
                <label>Compile on file save:
                </label>
                <input type="checkbox" checked={this.props.compileOnSave} onChange={this.props.onCompileOnSaveChange} />
              </li>
            </ul>
          </form>
        </Modal>
      </div>
    )
  }
}

Settings.propTypes = {
  compileOnSave: PropTypes.bool,
  onCompileOnSaveChange: PropTypes.func,
  formatOnSave: PropTypes.bool,
  onFormatOnSaveChange: PropTypes.func,
  keyboardHandler: PropTypes.string,
  onKeyboardHandlerChange: PropTypes.func,
  fontSize: PropTypes.number,
  onFontSizeChange: PropTypes.func,
  tabSize: PropTypes.number,
  onTabSizeChange: PropTypes.func,
  editorTheme: PropTypes.string,
  onEditorThemeChange: PropTypes.func,
  onClose: PropTypes.func
}

export default Settings
