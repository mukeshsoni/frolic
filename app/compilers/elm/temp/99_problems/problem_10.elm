-- Run-length encode a list of list to a list of tuples. Unlike lists, tuples can mix types. Use tuples (n, e) to encode a list where n is the number of duplicates of the element 

runLengths : List (List a) -> List (Int, a)
runLengths xss =
    -- your implementation here
    []