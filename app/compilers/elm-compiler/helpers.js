import _ from 'lodash'
import crypto from 'crypto'

export function cleanUpExpression(expr) {
  return _.trimEnd(expr.split('--')[0])
}

export function getExpressionValue(expr) {
  if (expr.commands) {
    return expr.commands.reduce((acc, command) => acc + cleanUpExpression(command.value), '')
  } else {
    return cleanUpExpression(expr.value)
  }
}

const hash = _.memoize(function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex')
})

export function createTokenHash(fileName = '', token, code) {
  return hash(`${fileName}${getExpressionValue(token)}${hash(code)}`)
}
