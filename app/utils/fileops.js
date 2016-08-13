// top level libraries
import Promise from 'bluebird'

var exec = require('child_process').exec;
var fs = require('fs')
var writeFile = Promise.promisify(fs.writeFile)
var appendFile = Promise.promisify(fs.appendFile)
var readFile = Promise.promisify(fs.readFile)

// var remote = require('electron').remote; // Load remote compnent that contains the dialog dependency
var { dialog } = require('electron').remote; // Load the dialogs component of the OS

export function saveFile(content, filePath) {
    return new Promise((resolve, reject) => {
        if(!filePath) {
            dialog.showSaveDialog(function (fileName) {
                if (fileName === undefined){
                    return reject(new Error('No file name selected'))
                } else {
                    // fileName is a string that contains the path and filename created in the save file dialog.
                    writeFile(fileName, content)
                        .then(() => resolve(fileName))
                        .catch(err => reject(err))
                }
            })
        } else {
            writeFile(filePath, content)
                .then(() => resolve(filePath))
                .catch(err => reject(err))
        }
    })
}

export function openFile() {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{name: 'Elm files', extensions: ['elm']}]
        }, function(filePaths) {
            if(filePaths === undefined) {
                return reject(new Error('no file selected'))
            }

            fs.readFile(filePaths[0], (err, content) => {
                if(err) {
                    return reject(err)
                } else {
                    return resolve({
                        filePath: filePaths[0],
                        content: content.toString()
                    })
                }
            })
        })
    })
}
