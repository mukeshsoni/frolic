import React, { Component } from 'react'
import Modal from 'react-modal'

// import css
import styles from './Settings.css'

class Settings extends Component {
    constructor(props)  {
        super(props)
        this.closeModal = this.closeModal.bind(this)
    }

    closeModal() {
        this.props.onClose()
    }

    render() {
        console.log(styles)
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
                    <h1>Close Me With Escape Modal</h1>
                    <button onClick={this.closeModal}>Close</button>
                    <input />
                    <input />
                </Modal>
            </div>
        )
    }
}

export default Settings
