# Reader Functions
Normally, writing and tuning the reader functions for an isotask will be the most time consuming part of setting up Isomorphory.
Generically, Isomorphory requires exactly two reader functions.
These reader functions should have the following type:

`() -> Promise<object[] | null>`

That is, a reader function should take no arguments and return a Promise resolving to an array of objects.
Each object is usually a single row or item from the datastore, coerced into a Javascript object.
When the reader has read all rows from the datastore, it should return `null`.
This signals to Isomorphory there are no more results to read.

For Isomorphory to work, it is also imperative that this reader function return a chunk of data that is reasonably sized.
If the chunk is too large, or if the reader attempts to pull in an entire datastore into memory, the NodeJS process will run out of memory and crash.
So, to avoid this, you will need to find a way of breaking your datastore into reasonably sized chunks.
In general, there will be many ways of doing this.
Some ways will be much more performant than others.

For SQL databases, this normally means at a minimum you will need to order the result set in order to guarantee consistent results between sequential reads.
One method for breaking the dataset into chunks is the `LIMIT...OFFSETT` method for paging into datastores.
*This method has poor performance for large data stores.*
An alternative is to use an indexed column or collection of indexed columns.
Ordering the data set using this column(s), you can add a `LIMIT` and a `WHERE` condition to page through the result set.

For example, to query `widgets`  10,000 at a time with primary key `widgets_pk` using this method, you could do:

```
SELECT * FROM widgets
ORDER BY widgets_pk
WHERE widgets_pk > $1
LIMIT 10000
```

Here, there is a parameter for the `widgets_pk` that allows calling code to pass in the last value read from the datastore.

Of course, this method has its own subtleties and drawbacks: for example, data inserts in the middle of the read process may cause results to be missed if the datastores are changing at high velocity.

For NoSQL databases, you might need to get more creative.
For some databases, connectors are defined in Isomorphory which can assist you.
If you are attempting to apply isomorphory to a database without a connector, consider supplying one yourself!