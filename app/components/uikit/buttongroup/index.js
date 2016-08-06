import React, { Component } from 'react'


import styles from './buttongroup.css'

class ButtonGroup extends Component {
    render() {
        return (
            <div className={styles['btn-group']}>
                {this.props.children}
            </div>
        )
    }
}

export default ButtonGroup
