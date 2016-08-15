-- Keep elements from the start of a list while they satisfy a condition


takeWhile : (a -> Bool) -> List a -> List a
takeWhile predicate list =
    -- your implementation here
    list