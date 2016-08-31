import React from 'react'

const Error = ({error}) => {
    return (
        <div style={{height: '100%', background: '#D8000C'}}>
            <pre>{error.toString()}</pre>
        </div>
    )
}

export default Error
