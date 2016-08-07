import React from 'react'
import styles from './footer.css'

const SPACE = ' '
function Footer({openFilePath, fileSaved}) {
    return (
        <div
            className={styles.footer}
            >
            {openFilePath}
            <div style={{float: 'right'}}>
                {SPACE}{SPACE}{SPACE}
                {fileSaved ? 'File saved' : 'File not saved'}
            </div>
        </div>
    )
}

export default Footer;
