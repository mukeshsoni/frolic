import React from 'react'
import Promise from 'bluebird'

function compile(code, playgroundCode, openFilePath) {
    return new Promise.resolve(<div>hey from react</div>)
}

function cleanUp() {

}

function onNewFileLoad() {

}

function formatCode(code) {
    return code
}

function generateTests() {
    return ''
}

export function compiler() {
    return {
        compile,
        cleanUp,
        onNewFileLoad,
        formatCode,
        generateTests,
    }
}
