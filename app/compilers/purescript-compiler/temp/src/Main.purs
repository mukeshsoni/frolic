module Main where

import Prelude
import Control.Monad.Eff (Eff)
import Control.Monad.Eff.Console (CONSOLE, log)
import PlaygroundCode (toRun)
import Data.Foldable

main :: forall e. Eff (console :: CONSOLE | e) Unit
main = do
  log (foldMap show toRun)
  log "Hello sailor!!!"
