import { pipeline } from 'stream/promises';
import { Readable, Transform } from 'stream';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getArrayDiffs,
  unstringifyObject,
  stringifyObject,
  defaultFormatFn,
  defaultCompareFn,
} from './defaults.js';
import {FormatFn, JoinFn, ReadFn, CompareFn, IndependentReadFn, TransformFn,  DefaultCompareResult, CompareResult} from './types';
/**
 * This function takes an array of tasks and executes them one at a time by popping them off of the array.
 * This function is used to allow running async tasks maximally parallel.
 * There are no synchronization issues because arry operations in Javascript are blocking, multiple executors
 * can pull off the same array without interfering with each other.
 * @param {Array<Function>} taskQueue An array of async functions taking no parameters
 * @returns {Array<any>} The results returned by running all of the async functions
 */
type Task = () => Promise<any>;
async function executeTasks(taskQueue: Task[]): Promise<any[]> {
  const acc = [];
  let nextTask = taskQueue.shift();
  while (typeof nextTask !== 'undefined') {
    const result = await nextTask();
    acc.push(result);
    nextTask = taskQueue.shift();
  }
  return acc;
}

/**
 * Run a fixed number of promises in parallel. Throws an exception if any of the tasks do not fulfill.
 * @param {number} limit Integer: maximum number of task to run at once
 * @param {Function} tasks Async functions which take no arguments and return a promise
 * @returns {Promise<any[]>} An array of completed promises.
 */
export async function parallelLimit(limit: number, tasks: Task[]): Promise<any[]> {
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
  const flattened = results
    .map((r) => r.status === 'fulfilled' && r.value)
    .filter(r => !!r)
    .flat();
  return flattened;
}

/**
 * @param {Function[]} fns An array of streams/functions to be executed in a Stream pipeline
 */
export async function executeIsoTask(fns: Function[]) {
  await pipeline(...fns, (err: Error) => (err ? console.error(err) : null));
}

// /**
//  * @param {number} maxRetries
//  * @param {Function} fn A function with signature () -> Result
//  */
// const withRetry = curry((maxRetries, fn, errorFn, failFn) => {
//   const retrier = (retryCount) => (args) => {
//     const res = retryCount < maxRetries ? fn() : failFn();
//     if (res.error) {
//       return retrier(retryCount + 1)(args);
//     }
//     return res.value;
//   };
//   return retrier(0);
// });

/**
 *
 * @param {Function} readerFn Function with signature () -> null | object[]. It must be a closure which internally tracks any bookmarks
 * it must keep track of.
 */
export async function* readIteratorFactory(readerFn: ReadFn) {
  while (true) {
    const res = await readerFn();
    if (res !== null) {
      yield res;
    } else return;
  }
}

export function createParallelReadStream(aReaderFn: ReadFn, bReaderFn: ReadFn) {
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
 *
 * @param {ReadFn} aReaderFn () -> any : A function taking no arguments which fetches the results from the source data store
 * @param {ReadFn} bReaderFn A function which takes the results from aReaderFn and uses these to read results.
 * @returns
 */
export function createSequentialReadStream(aReaderFn: IndependentReadFn, bReaderFn: ReadFn) {
  return Readable.from(
    readIteratorFactory(async () => {
      const aResults = await aReaderFn();
      const bResults = await bReaderFn(aResults);
      // If both results are null, break out of the iterator which will close the read stream
      if (aResults === null && bResults === null) {
        return null;
      }

      return [aResults, bResults];
    }),
    { objectMode: true }
  );
}

/**
 * Need to add some way of keeping track of state across chunks in comparison functions to get total counts
 * @param {} transformFn
 * @returns {Transform} A transfrom stream
 */
export function createDataTransform(transformFn: CompareFn | TransformFn = defaultCompareFn): Transform {
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
 * Create a transform stream that stores the results in a buffer until its read source is closed.
 * This is useful for set/set comparisons that require that diffs be kept in memory.
 * @param {Function} compareFn [[*], [*], number] -> [[*], [*], number]
 * @returns
 */
export function createPausedDataTransform(compareFn: CompareFn = defaultCompareFn): Transform {
  let accumulator: DefaultCompareResult = [[], [], 0];
  return new Transform({
    objectMode: true,
    transform(chunk, _, callback) {
      const chunkAsResult = (chunk as DefaultCompareResult);
      accumulator[0].push(...chunkAsResult[0]);
      accumulator[1].push(...chunkAsResult[1]);
      accumulator = compareFn(accumulator);
      callback();
    },
    // Only send data once the read stream has finished
    final(callback) {
      this.push(accumulator);
      callback(null);
    }
  }).on('error', () => saveProgress(accumulator));
}

/**
 * Need to add some way of keeping track of state across chunks in comparison functions to get total counts
 * @param {Function} formatFn `* -> string[]` A function which takes the output of a comparison stream and maps it to an array of strings
 * @returns A Transform stream which applies formatFn to each chunk. The return value of formatFn is then converted to a Buffer, joined by '\n',
 * and written to the write stream.
 */
export function createFormatStream(
  formatFn = defaultFormatFn,
  joinFn = (strArr: string[]) => strArr.join('\n')
): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk, _, callback) {
      const transformedData = formatFn(chunk);
      callback(null, Buffer.from(joinFn(transformedData), 'utf-8'));
    }
  });
}

export const PARTIAL_DIRECTORY = '.isomorpher';
export const RESULTS_FILE = 'partial.json';
/***
 * 1. Check for previous progress
 * 2. Find a way to dump current diffs
 * 3. Create hidden file for saving data
 * TO DO: figure out how to handle multiple instances running on the same machine...
 */
function makeLoggingDir() {
  try {
    const dirName = join('./', PARTIAL_DIRECTORY);
    mkdirSync(dirName);
  } catch (e) {
    if ((e as {code: string}).code === 'EEXIST') {
      return;
    } else {
      console.error(e);
      throw new Error(
        `Could not create temporary directory for saving work; please ensure that you have correct permissions for ${tmpdir()}`
      );
    }
  }
}

export function saveProgress(data: object) {
  makeLoggingDir();
  writeFileSync(
    join('./', PARTIAL_DIRECTORY, RESULTS_FILE),
    JSON.stringify(data)
  );
}

// What is a good API to use here? Can we log the state of the compare functions and of the
// Actually, we need the streams to hold on to missing/extra and keep making use of them until all the comparisons are completed

// Re-export default utilites for convenience
export { getArrayDiffs, stringifyObject, unstringifyObject };
