**Note** - I have ported the backend of frolic into an atom plugin so that the editor experience is much better - https://atom.io/packages/elm-instant

# Frolic

With Frolic, you can start typing expressions and immediately see results in the output panel without any glue code. Plus, it works for ui components too!

## Features

- Immediate feedback
- Quick way for someone new to the language to try it out
- Mix of ui components + normal expressions
- Has around 38 packages built in (the list is below). E.g. Just do `import Http` and it will work.
- Can load files from the disk and the dependencies will be resolves automatically
- Can save playground code as a file. Also, when the code file is loaded in the future, the playground file automatically gets loaded with it. That way, you can think of the playground code as sort of clojurescript devcards.
- Having multiple ui components to try out in same output window (like [clojurescript devcards](https://github.com/bhauman/devcards))

![Elm counter pairs from elm-architechture examples](images/elm-playground-desktop-counter-pairs.gif)

Frolic was inspired by [haskell for mac](http://haskellformac.com), the idea is to have a playground panel where users can type out code expressions and see the result instantaneously without any setup. There is a similar thing currently for elm ([elm-lang.org/try](elm-lang.org/try)) but it has limited functionality and doesn't work without having the ui layer (model, view, update, main etc.).

#### The project is still in heavy development. You currently need to clone and run locally. Contributions and feedback are welcome!

## Setup

```
npm install elm -g -- in case you don't have elm installed already
git clone https://github.com/mukeshsoni/frolic
npm install
npm run build
npm run start
```

**Note**
To test out your ui components just copy whatever you would pass to `main` and call it (in the playground panel) will a function named `render` (also checkout the gif in case of confusion). E.g.
```
render
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }
```

## Packages included by default
- elm-lang/animation-frame
- elm-lang/core
- elm-lang/dom
- elm-lang/geolocation
- elm-lang/html
- elm-lang/keyboard
- elm-lang/lazy
- elm-lang/mouse
- elm-lang/navigation
- elm-lang/page-visibility
- elm-lang/svg
- elm-lang/trampoline
- elm-lang/websocket
- elm-lang/window
- evancz/elm-http
- evancz/elm-markdown
- elm-community/undo-redo
- elm-community/easing-functions
- elm-community/elm-lazy-list
- elm-community/elm-linear-algebra
- elm-community/elm-material-icons
- elm-community/elm-webgl
- elm-community/graph
- elm-community/intdict
- elm-community/list-split
- elm-community/html-extra
- elm-community/json-extra
- elm-community/maybe-extra
- elm-community/random-extra
- elm-community/result-extra
- elm-community/string-extra
- elm-community/svg-extra
- elm-community/array-extra
- elm-community/basics-extra
- elm-community/dict-extra

## Dev setup

```
npm install
npm install elm -g -- in case you don't have elm installed already
-- go to folder app/compilers/elm/temp/ and do
elm-package install -y
-- from the root folder run
npm run hot-server
npm run start-hot
```

## Maintainers

- [Mukesh Soni](https://github.com/mukeshsoni)

## License
MIT © [Mukesh Soni](https://github.com/mukeshsoni)
