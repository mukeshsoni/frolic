import React, { Component } from 'react'
import MainWindow from './MainWindow/index.js'

import { compiler as elmCompiler } from '../compilers/elm/elm.js'
const { compile: compileElm, cleanUp: cleanUpElm } = elmCompiler()

import { compiler as purescriptCompiler } from '../compilers/purescript/purescript.js'
const { compile: compilePurescript, cleanUp: cleanUpPurescript } = purescriptCompiler()


import {ipcRenderer} from 'electron'

ipcRenderer.on('menuActions', (event, message) => {
    alert('got message: ' + message.action)
    if(!message || !message.action) {
        return
    }

    switch(message.action) {
        case 'newFile':
            break;
        case 'openFile':
            break;
        case 'saveFile':
            break;
        default:
            console.log('don\'t understand the menu action', message.action)
    }
})

const compilers = {
    elm: {
        compile: compileElm,
        cleanUp: cleanUpElm,
        editorMode: 'elm',
    },
    purescript: {
        compile: compilePurescript,
        cleanUp: cleanUpPurescript,
        editorMode: 'haskell',
    }
}


export default class App extends Component {
    constructor(props) {
        super(props)

        this.handleLanguageChange = this.handleLanguageChange.bind(this)
        this.state = {
            language: 'elm'
        }
    }

    componentWillUnmount() {
        Object.keys(compilers).map((compilerKey) => {
            compilers[compilerKey].cleanUp()
        })
    }

    handleLanguageChange(e) {
        compilers[this.state.language].cleanUp()
        this.setState({language: e.target.value})
    }

    render() {
        return (
            <div>
                <Home
                    compile={compilers[this.state.language].compile}
                    language={this.state.language}
                    editorMode={compilers[this.state.language].editorMode}
                    onLanguageChange={this.handleLanguageChange}
                    />
            </div>
        )
    }
}
