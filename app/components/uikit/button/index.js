import React from 'react'
import classnames from 'classnames'

import styles from './button.css'

const Button = ({active, onClick, className, children}) => {
    const classes = classnames({
        [styles.btn]: true,
        [styles['btn-info']]: true,
        [styles.active]: active
    })

    return (
        <button
            className={classes}
            onClick={onClick}
            >
            {children}
        </button>
    )
}

export default Button
