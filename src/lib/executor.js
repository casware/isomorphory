import { createWriteStream } from 'fs';
import { resolve } from 'path';
import {
  createDataTransform,
  createFormatStream,
  createParallelReadStream,
  createSequentialReadStream,
  createPausedDataTransform,
  executeIsoTask
} from './utils.js';
import { pipeline } from 'stream/promises';

function buildReader(sequentialRead, readFns) {
  const [aReader, bReader] = readFns;
  // Consider changing the sequential read creators to take an array of functions instead

  return sequentialRead
    ? createSequentialReadStream(aReader, bReader)
    : createParallelReadStream(aReader, bReader);
}
function buildTransform(pausedTransform, transformFn) {
  // Consider changing the sequential read creators to take an array of functions instead

  return pausedTransform
    ? createPausedDataTransform(transformFn)
    : createDataTransform(transformFn);
}

function buildOutputStream(outputPath) {
  const pathStr = resolve(outputPath);
  const writeStream = createWriteStream(pathStr, { encoding: 'utf-8' });
  return writeStream;
}

/**
 *
 * @param {Object} task
 * @returns {Function} A function: () => Promise<any> representing an async task to be executed
 */
export function executor(taskDefinition) {
  return async () => {
    const {
      setupFn,
      teardownFn,
      compareFn,
      formatFn,
      joinFn,
      transformFn, // Consider whether this should be one or two functions?
      errorFn,
      pauseTransform,
      readFns,
      retryOptions,
      sequentialRead,
      outputPath
    } = taskDefinition;
    try {
      if (setupFn) {
        await setupFn();
      }
      await pipeline(
        buildReader(sequentialRead, readFns),
        buildTransform(pauseTransform, transformFn),
        createFormatStream(formatFn, joinFn),
        buildOutputStream(outputPath)
      ).catch((e) => (errorFn ? errorFn(e) : console.error(e)));
    } catch (e) {
      console.log(e);
    } finally {
      if (teardownFn) {
        await teardownFn();
      }
    }
  };
}
