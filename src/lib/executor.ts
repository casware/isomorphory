import { createWriteStream } from 'fs';
import { resolve } from 'path';
import {
  createDataTransform,
  createFormatStream,
  createParallelReadStream,
  createSequentialReadStream,
  createPausedDataTransform,
  executeIsoTask
} from './utils';
import { pipeline } from 'stream/promises';
import {
  CompareResult,
  CompareFn,
  ExecutorTaskDefinition,
  ReadFn,
  TransformFn
} from './types';
function buildReader(sequentialRead: boolean, readFns: [ReadFn, ReadFn]) {
  const [aReader, bReader] = readFns;
  // Consider changing the sequential read creators to take an array of functions instead

  return sequentialRead
    ? createSequentialReadStream(aReader, bReader)
    : createParallelReadStream(aReader, bReader);
}
function buildTransform(
  pausedTransform: boolean,
  compareFn: CompareFn
) {
  // Consider changing the sequential read creators to take an array of functions instead

  return pausedTransform
    ? createPausedDataTransform(compareFn)
    : createDataTransform(compareFn);
}

function buildOutputStream(outputPath: string) {
  const pathStr = resolve(outputPath);
  const writeStream = createWriteStream(pathStr, { encoding: 'utf-8' });
  return writeStream;
}

/**
 *
 * @param {Object} task
 * @returns {Function} A function: () => Promise<any> representing an async task to be executed
 */
export function executor(
  taskDefinition: ExecutorTaskDefinition
): () => Promise<void> {
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
