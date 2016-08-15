-- Drop items from the start of a list while they satisfy criteria specified by a function


dropWhile : (a -> Bool) -> List a -> List a
dropWhile predicate list =
    -- your implementation here
    list