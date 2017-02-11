module Main exposing (..)

import Debug
import Html
import PlaygroundCode exposing (..)

add x y = x + y

-- concatResults : any -> String -> String
concatResults command acc =
    acc ++ command

runDisplay commandsToRun =
    let
        finalOutput = List.foldl concatResults "" commandsToRun
    in
        Debug.log finalOutput ""

main =
    Html.beginnerProgram
        { model = runDisplay toRun
        , view = (\x -> Html.text "")
        , update = (\x y -> y)
        }
