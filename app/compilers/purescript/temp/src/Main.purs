module Main where

import Prelude
import PlaygroundCode (toRun)
import Data.Foldable
import Control.Monad.Eff (Eff)
import Control.Monad.Eff.Console (CONSOLE, log)

main :: forall e. Eff (console :: CONSOLE | e) Unit
main = do
  log (foldMap show toRun)
