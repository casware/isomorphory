# Isomorphory

A Javascript framework for testing that two data stores are *isormorphic*.

## Use Case
Use isomorphory if 
- you care about data quality, but don't have a good tool for measuring it throughout your data pipelines
- you need to quickly spin up a tool for comparing data stores in Javascript.
- you are creating/maintaing a data pipeline and need to ensure that the data is arriving correcty at the end of the pipeline
- off-the shelf data profiling solutions don't fit your use case, or you don't have the time and resources to learn how to use them

## Features
Isomorphory handles the plumbing so that you can focus on the data.
Isomorphory is strucutured around running iso-tasks.
An iso-task is a comparison of a single *chunk* of data, where you get to define how large or small a chunk is.
There is the following tree: iso-tasks -> iso-chains -> iso
1. Partial progress - if an error occurs during a ----- run, all progress up to that point is persisted; isomorphory handles restarting the job *from the point of failure* out of the box
2. Parallelization - run iso-tasks up to some parallel limit, maximally efficiently (coming soon)
3. Stream results - hold results in memory only as long they are needed but no longer
4. Error handling - global retry options that can be overrided for each specific function
5. Data store agnostic - you write the data connection layer, so isomorphory does not care if you are pulling data from PostgreSQL, DynamoDB, or flat files

## Usage Guide
Every iso-task performs the following operations in a loop:
1. Read data from both datastores using `readFn`
2. Transform the read results using `transformFn` (default is identity transformation)
3. Compare the transformed results with `compareFn` (default will be explained in detail below)
4. Format the results of the comparison using `formatFn`
5. Pipe the output of `formatFn` to a write stream.

This process is repeated until `readFn` returns `null`.
The `readFn` is expected to return a `Promise<object[]>`, meaning a Promise which resolves to an array of objects.
Each array is a single "chunk" of data read from the two data stores.
For Isomorphory to scale to normal sized datasets, *`readFn` must limit the size of its return set and iterate through the datastore in chunks*.
If `readFn` attempts to read the entire datastore into memory, of course Isomorphory will run out of memory on a production datastore.
This imposes some limitations on the type of datastores that can be compared with Isomorphory: namely, it must be possible to read sequentially from both datastores.
In addition, if the default `compareFn` is being used, the `readFn` must be able to guarantee that results will not be duplicated.
If this condition is not met, there will be false positives flagged by the default `compareFn`.

### Example usage
Here is an example of using Isomorphory to compare two datastores.
One is the `iso3166` database of countries and sub-countries and the other is a copy of this same datastore with a few rows removed.

The core functionality is encapsulated in these lines:

```
const compareSubCountries = executor({
    teardownFn: async () => {
      await connA.end();
      await connB.end();
    },
    readFns: [makeReader(connA), makeReader(connB)], // Required
    // compareFn
    outputPath: 'diff.csv', // Required
    pauseTransform: true
  });
  
await compareSubCountries();
```

These few lines of code illustrate how Isomorphory works.
It takes at a minimum a `readFns` argument, which is an array of functions.
The first function reads from the source datastore and the second from the target datastore.
Each read function returns a single chunk of data each time it is called until it has stepped through the entire data set.
When it has finished reading, it will return `null`.
A teardown function is provided to close the database connections after the comparison has completed.
The `makeReader` function which appears in this example is taking care of wrapping the database query function in such a way that it behaves in this way.

Here is the complete code example which defines the `teardownFn`, `readFns`, and so on:

```
import { executor } from 'isomorphory';
import { readFileSync } from 'fs';
// Set up readers
const connA = new Client({
  user: 'postgres',
  host: 'localhost',
  port: '5432',
  database: 'iso3166',
  password: ''
});

// Connect to target database
const connB = new Client({
  host: 'localhost',
  port: '5432',
  database: 'copy',
  password: ''
});

const connect = async () => {
  await Promise.all([connA.connect(), connB.connect()]);
  return [connA, connB];
};

// SQL for reading sub countries
const sqlSubCountry = `select * from subcountry
where country || '#' || subcountry_name > $1  -- Easy, but slow
order by country, subcountry_name asc
limit 500;`

const reader = async (conn, sql, params) => {
  const res = await conn.query(sql, params);
  return res.rows;
};

const getParams = (row) => {
  return [[row.country, row.subcountry_name].join('#')];
};

const makeReader = (conn) => {
  let last = ['AA#AA'];
  const readFn = async () => {
    if (last !== null) {
      const result = await reader(conn, sqlSubCountry, last);
      last = result.length > 0 ? getParams(result[result.length - 1]) : null;
      return result;
    }

    return null;
  };
  return readFn;
};

const main = async () => {
  const [connA, connB] = await connect();
  const compareSubCountries = executor({
    teardownFn: async () => {
      await connA.end();
      await connB.end();
    },
    readFns: [makeReader(connA), makeReader(connB)], // Required
    // compareFn
    outputPath: 'diff.csv', // Required
    pauseTransform: true
  });
  await compareSubCountries();
};

main();
```

There are a few simple steps going on here:
1. Database connections are initialized for both source and target data stores.
2. The `reader`, `getParam` and `makeReader` functions are defined to make stepping through the data store simple.
   1. The `reader` function queries a connection with a given SQL string and parameter values, and returns the result.
   2. The `getParam` function which gets the last country/subcountry combination from the result set.
   3. The `makeReader` function which returns a reader function. This structure was followed to make it easy to employ *closures* for keeping track of the position in the data set. Using closures means that the reader function passed to Isomorphory does not require any parameters but can simply be called and will return the next result set. (A future version of Isomorphory will add the ability to pass parameters into the `readFn`, but for simplicity, the current version of Isomorphory does not allow this.)
3. All the pieces are put together in the first actual call to Isomorphory to define an `executor`. The options are passed in to the executor, which is finally called to compare sub-countries between the two data stores.

Note that if any of the `transformFn`, `compareFn`, `formatFn`, `teardownFn` are not supplied default functions are used.