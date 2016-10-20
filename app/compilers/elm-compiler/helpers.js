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

export function createHash(fileName='', token) {
    return crypto.createHash('md5').update(`${fileName}${getExpressionValue(token)}`).digest("hex")
}
