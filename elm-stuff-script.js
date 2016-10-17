var Promise = require('bluebird')
var mkdirp = Promise.promisify(require('mkdirp'))
var ncp = Promise.promisify(require('ncp').ncp)
const writeFile = Promise.promisify(require('fs').writeFile)
var path = require('path')
var exec = Promise.promisify(require('child_process').exec)

const tempFolderPath = 'app/compilers/elm-compiler/temp'

exec('rm -rf dist')
  .then(() => mkdirp('dist/' + tempFolderPath))
  .then(() => ncp(tempFolderPath, 'dist/' + tempFolderPath))
  .then(() => {
    process.chdir('dist/' + tempFolderPath)
    var elmPackageJson = require(path.join(process.cwd(), 'elm-package-template.js'))
    return exec('rm -rf elm-stuff elm-package.json')
      .then(() => writeFile('elm-package.json', JSON.stringify(elmPackageJson)))
  })
  .then(() => exec('elm-package install -y'))
  .then(console.log)
  .catch(console.error)
