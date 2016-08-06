import React, { Component } from 'react'


import styles from './buttongroup.css'

function renderChildren(props) {
    return React.Children.map(props.children, (child, index) => {
        if(index === 0) {
            return React.cloneElement(child, {
                className: styles['first-not-last-button'] + ' ' + styles['first-button']
            })
        }

        if(index === props.children.length - 1) {
            return React.cloneElement(child, {
                className: styles['last-not-first-button']
            })
        }

        return React.cloneElement(child, {
            className: styles['not-first-last-button']
        })
    })
}

function ButtonGroup(props) {
    return (
        <div className={styles['btn-group']}>
            {renderChildren(props)}
        </div>
    )
}

export default ButtonGroup
