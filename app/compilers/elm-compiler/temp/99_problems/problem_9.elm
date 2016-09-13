-- Convert a list to a list of lists where repeated elements of the source list are packed into sublists. Elements that are not repeated should be placed in a one element sublist.
pack : List a -> List (List a)
pack xs =
    -- your implementation goes here
    [[]]