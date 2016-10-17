var Promise = require('bluebird')
var mkdirp = Promise.promisify(require('mkdirp'))
var ncp = Promise.promisify(require('ncp').ncp)
const writeFile = Promise.promisify(require('fs').writeFile)
var path = require('path')
var exec = Promise.promisify(require('child_process').exec)

const reactCompilerPath = 'app/compilers/react-compiler'

mkdirp('dist/' + reactCompilerPath)
  .then(() => ncp(reactCompilerPath, 'dist/' + reactCompilerPath))
  .then(() => {
    process.chdir('dist/' + reactCompilerPath)
    return exec('npm install')
  })
  .then(console.log)
  .catch(console.error)
