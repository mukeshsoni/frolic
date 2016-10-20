import { tokenize } from '../parser.js'
import { createHash } from '../helpers.js'

const playgroundCode = `[12,4, 9, 19, 20]

Html.program
      { init = init
      , view = view
      , update = update
      , subscriptions = subscriptions
      }

add x y = x + y

add 3 4

add 1 3

$view controlsView
`

test('1', function() {
  const tokens = tokenize(playgroundCode.trim())
  const tokensWithHashes = tokens.map((token) => ({
      ...token,
      hash: createHash('', token)
  }))
  console.log(JSON.stringify(tokensWithHashes, null, 2))
  expect(1+1).toBe(2)
})
