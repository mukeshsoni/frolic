import React from 'react'

import styles from './buttongroup.css'

function ButtonGroup({children}) {
    return (
        <div className={styles['btn-group']}>
            {children}
        </div>
    )
}

export default ButtonGroup
