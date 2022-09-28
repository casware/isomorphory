import { curry } from 'ramda';
import { pipeline } from 'stream/promises';
import { Readable, Transform, Writable } from 'stream';
/**
 * This function takes an array of tasks and executes them one at a time by popping them off of the array.
 * This function is used to allow running async tasks maximally parallel.
 * There are no synchronization issues because arry operations in Javascript are blocking, multiple executors
 * can pull off the same array without interfering with each other.
 * @param {Array<Function>} taskQueue An array of async functions taking no parameters
 * @returns {Array<any>} The results returned by running all of the async functions
 */
const executeTasks = async (taskQueue) => {
  const acc = [];
  let nextTask = taskQueue.shift();
  while (typeof nextTask !== 'undefined') {
    const result = await nextTask();
    acc.push(result);
    nextTask = taskQueue.shift();
  }
  return acc;
};

/**
 * Run a fixed number of promises in parallel. Throws an exception if any of the tasks do not fulfill.
 * @param {number} limit Integer: maximum number of task to run at once
 * @param {Function} tasks Async functions which take no arguments and return a promise
 * @returns {Promise<any[]>} An array of completed promises.
 */
export async function parallelLimit(limit, tasks) {
  const queue = [...tasks];
  const maxExecutors = tasks.length < limit ? tasks.length : limit;
  const results = await Promise.allSettled(
    [...new Array(maxExecutors)].map((_) => executeTasks(queue))
  );
  results.forEach((result) => {
    if (result.status !== 'fulfilled') {
      throw new Error(`Task did not fulfill: ${result.reason}`);
    }
  });
  const flattened = results.map((r) => r.value).flat();
  return flattened;
}

/**
 * Converts an object into a formatted string. For this function to work properly with unstringifyObject,
 * the object's properties and values should be strings which do not contain private unicode characters '\uE880' or '\uE881'.
 * @param {object} obj An object with strings for values
 * @returns {string} A string with concatenated object properties/values. For example, the object { prop1: val1, prop2: val2} will be mapped to the string 'prop1#val1@prop2#val2'.
 */
export function stringifyObject(obj) {
  const sortedEntries = Object.entries(obj).sort(([a], [b]) => {
    // Need to sort properties by name to get the same string for the same object
    if (a < b) {
      return -1;
    }
    if (b < a) {
      return 1;
    }
    return 0;
  });
  const joinedKeyVal = sortedEntries.map(([key, val]) => `${key}\uE880${val}`);
  return joinedKeyVal.join('\uE881');
}

/**
 * Inverse function to `stringifyObject`.
 * @param {string} str A stringified object in the format returned by `stringifyObject`.
 * @returns {object} The object represented by the formatted string `str`.
 */
export function unstringifyObject(str) {
  if (str === '') {
    return {};
  } // Return an empty object for the empty string so this correctly inverts stringifyObject
  const splitKeyValPairs = str.split('\uE881');
  const entries = splitKeyValPairs.map((s) => s.split('\uE880'));
  return Object.fromEntries(entries);
}

/**
 * Returns the elements remaining in two array after elements which occur in both arrays are deleted.
 * Repeated elements within each array are ignored.
 * @param {[string[], string[]]} param An tuple of arrays of strings
 * @returns {[string[], string[], number]} Returns an array containing two arrays of strings and a number representing the number of identical elements in the parameters.
 * The first array contains strings which are present in `a` and not present in `b`.
 * The second array contains strings present in `b` but not in `a`.
 */
export function getArrayDiffs([a, b]) {
  const setB = new Set(b);
  const setA = new Set(a);
  let matches = 0;
  setA.forEach((el) => {
    if (setB.has(el)) {
      setB.delete(el);
      setA.delete(el);
      matches++;
    }
  });

  return [[...setA], [...setB], matches];
}

/**
 * @param {Function[]} fns An array of streams/functions to be executed in a Stream pipeline
 */
export async function executeIsoTask(...fns) {
  await pipeline(...fns, (err) => (err ? console.error(err) : null));
}

/**
 * @param {number} maxRetries
 * @param {Function} fn A function with signature () -> Result
 */
const withRetry = curry((maxRetries, fn, errorFn, failFn) => {
  const retrier = (retryCount) => (args) => {
    const res = retryCount < maxRetries ? fn() : failFn();
    if (res.error) {
      return retrier(retryCount + 1)(args);
    }
    return res.value;
  };
  return retrier(0);
});

/**
 *
 * @param {Function} readerFn Function with signature () -> null | object[]. It must be a closure which internally tracks any bookmarks
 * it must keep track of.
 */
export async function* readIteratorFactory(readerFn) {
  while (true) {
    const res = await readerFn();
    if (res !== null) {
      yield res;
    } else return;
  }
}

export function createParallelReadStream(aReaderFn, bReaderFn) {
  return Readable.from(
    readIteratorFactory(async () => {
      const results = await Promise.all([aReaderFn(), bReaderFn()]);
      if (results[0] === null && results[1] === null) {
        return null;
      }
      return results;
    }),
    { objectMode: true }
  );
}

/**
 * Need to add some way of keeping track of state across chunks in comparison functions to get total counts
 * @param {} transformFn
 * @returns
 */
export function createDataTransform(transformFn) {
  return new Transform({
    objectMode: true,
    transform(chunk, _, callback) {
      const transformedData = transformFn(chunk);
      this.push(transformedData);
      callback(null, transformedData);
    }
  });
}

/**
 * Need to add some way of keeping track of state across chunks in comparison functions to get total counts
 * @param {} transformFn
 * @returns
 */
 export function createFormatStream(formatFn) {
  return new Transform({
    objectMode: true,
    transform(chunk, _, callback) {
      const transformedData = chunk.map(transformFn);
      transformedData.forEach(tc => this.push(tc));
      
      callback(null, Buffer.from(transformedData.join('\n'), 'utf-8'));
    }
  });
}
