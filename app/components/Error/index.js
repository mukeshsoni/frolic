import React from 'react'
import _ from 'lodash'

const Error = ({error='Some error'}) => {
    return (
        <div style={{height: '100%', background: '#D8000C'}}>
            <pre>{error.toString ? error.toString() : error}</pre>
        </div>
    )
}

export default Error
