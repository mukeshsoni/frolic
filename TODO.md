* elm component
  * [x] allow render function
  * [x] depending on what is passed to render, use App.beginnerProgram or App.program
  * [x] detect render function and do eval stuff
* [x] execute normal expressions using elm App.beginnerProgram instead of Debug.log
* [x] for files loaded from disk, we add a path to the folder the file is in to file-sources in elm-package.json. but that will not suffice. We need to checkout where elm-package.json for that file might be and add that path along with all other paths mentioned in that elm-package.json's source-directories
* [x] open to start a open blank file
* [x] if user loads a file from file system, then `import ModuleX` where ModuleX is somewhere in the folder from where file is loaded, that should work!
* [x] column hide and show (like in haskell for mac)
* [x] Red background to show errors
* [x] Save playground files
* [x] Load corresponding playground file when loading a file
* [x] Load particular playground file from disk
* [x] Loading spinners in taskbar when compile is in progress
* [x] BUG - writing comments in playground file, specially in the same line as code breaks it
* [x] BUG - any whitespace after end of line in any expression breaks playground
* [x] Allow font size and type change for editors and output window
* [x] BUG - None of the panes scroll past the height of viewport
* [x] preference window (like atom). Can start with editor preferences (theme, fontsize, vim/emacs keybindings etc.)
  * [x] persist settings changes to json storage and load settings from storage when booting app
* [x] integrate elm-format
* [x] change elm and purescript compilers to use rxjs
* [x] the interface with compilers needs to be observables. That way they can keep sending signals like 'compiling', 'compiling done x%', 'installing module x' etc. Streams are much more flexible for the use case
* [ ] **Frolic Lessons** - Allow creation of lessons (can start with lesson file with particular format). Allows users to go to next/previous questions etc., when a lesson is loaded
  * [ ] load frolic-lesson.json. will have the order of question files. Should have corresponding .frolic (playground) files
  * [ ] When user moves to next/previous/particular question, update json file so that next time the lesson file is loaded, start from that questions
  * [ ] jump to question number 'x'
  * [ ] Finish lesson?
  * [ ] Feedback (how many correct/wrong etc.)
  * [ ] hints
* [ ] give feedback on file save and playground file save
* [ ] use css `contain` property for output pane so that styles for output are isolated from rest of the styles - https://justmarkup.com/log/2016/04/css-containment/
  * [ ] instead use iframe for the output/preview pane
* [ ] the app should not know about which compilers to require. Instead the compilers should register themselves.
* [ ] cmd/ctrl-f to find stuff
* [ ] shortcuts to jump between editors
* [ ] run the compiler code in web workers
* [ ] change compiler api. remove compile. add onCodeChange and onPlaygroundCodeChange
* [ ] add support for react components with flow
* [ ] reload file from disk
* [ ] roll your own split pane HOC/component
* [ ] background color for output pane should be customizable
* [ ] use [memory-fs](https://www.npmjs.com/package/memory-fs) instead of writing files
* [ ] css fix for height
* [ ] Caching components generated for output - don't need to evaluate them all. In fact don't need to create files for them all
* [ ] Correct line number mapping when there are statements in there playground
* [ ] Add confirmation dialogs when user does a 'new file' or 'load file' action and a file is already loaded in an unsaved statements. Also check for unsaved changes to playground
* [ ] Show Playground file path somewhere
* [ ] Bundle 99 elm problems along with the app (with corresponding playground files, which are picked from the unit tests)
  * [ ] Can start by not bundling it but just creating a repo with one elm file and one .frolic (playground) file for each question
* [ ] Load code section from templates (e.g. simple UI component, UI component with subscription etc.)
* [ ] Generate tests from playground code
* [ ] For ui components, can generate tests for update function
* [ ] might not work on windows because of folder paths (/ vs \)
* [ ] because the key for Elm component doesn't change if that expression doesn't change, a change in the code window doesn't reflect in the output until something in the playground is changed :(
* [ ] optimize `key` generated for <Elm /> components. We are generating random keys right now, which leads to flash of screen. The key can actually be the expression itself. In that case, if the expression didn't change, no new key, hence react won't update that component
* [ ] elm-reactor does compilation and auto dependency installation. checkout it's code to see how it does auto dependency installation
* [ ] Need to implement split pane ourselves
* [ ] optimizations
  * [x] elm-package.json file is read and written on every compile. very very brute force. Need to take care of that. memoization might be a solution. or a variant of memoization where we remember the last openFilePath and don't do anything if things are same.
  * [x] optimize number of files generated (bundle expressions together in one file (create list of (toString (expression))))
* [ ] line mapping from playground expressions to output goes for a toss in three scenarios -
  * [ ] there are statements with expressions
  * [ ] the output content wraps in more than one line
  * [ ] when there is a mixture of expressions and ui components
* [ ] FIX Bug - keep getting this error `cannot read property appendChild of null`
  * looks like it happens in the elm VM
* [ ] use async await for async operations
* [ ] need more robust implementations for isAssignment, isStatement, isExpression, isModuleStatement etc. functions
* [x] remove postcss. confusing af.
  * looks like postcss is not part of webpack workflow at all. the weirdness is due to css-loader which produces some strange looking classnames and has to be used in a specific way
  * css loader in our webpack has a `modules` query parameter which is turning on css-modules. so now need to dig into css-modules
* [x] do not create the `<Elm />` component if the component it wraps is faulty (source (`module.exports[_.capitalize(fileName)]`) no embed method in it, is undefined etc)
* [ ] figure out a way to install the elm modules and purescript bower modules when packaging the electron app
* [ ] when user does `import module x` determine if it’s in local folder. if not, do a `elm package install x` automatically
  * [ ] Maintain a mapping of some common modules to their package names (e.g. Mouse -> elm-lang/mouse etc.) and then auto install them if someone requires them.
  * [ ] install all the most commonly used packages already in elm/temp
  * [ ] have a screencast where we implement some medium complexity ui component (like autocomplete - https://www.youtube.com/watch?v=KSuCYUqY058 or react-telephone-input), where you get instant feedback all the time
* [ ] time traveling slider
* [ ] make screencasts with the app like done in learn.hfm.io (haskell for mac)
      the online version as well as the desktop can give an option to select the language to learn (elm, purescript, javascript, haskell etc.). It then becomes any-language-learning-playground. The ability to add any other language should just be about providing a compile engine implementation which returns a promise which returns formatted (\ns) output
* [ ] might be able to use node streams to not read/write/read/write files to disk
* [ ] plugin concept like that in hyper term. just add the plugin name, it will be downloaded and installed for you
* [ ] ability to save playground code
* [ ] type hints on hover in the editors
* [ ] watch files which are imported in the loaded file as well as the loaded file and reload on change of any the files files
* [ ] ability to install a library by giving the name (e.g. elm-lang/html). If library already available, don't do nothing
