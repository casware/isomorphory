/**
 * 3-tuple of object array representing source data, object array of destination data,
 * number of matching objects
 */
export type SetupResult = Promise<object>;
export type DefaultCompareResult = [object[], object[], number]
export type CompareResult = DefaultCompareResult | object;
export type CompareFn = (tr: CompareResult) => CompareResult;

export type DefaultReadResult = Promise<object[]>;
export type ReadResult = DefaultReadResult | Promise<any>;
export type IndependentReadFn = (() => ReadResult )|( (config: SetupResult) => ReadResult )
export type DependentReadFn = ((r: ReadResult) => ReadResult) | ((config: SetupResult, r: ReadResult) => ReadResult);
export type ReadFn = IndependentReadFn | DependentReadFn;

export type TransformFn = (r: [ReadResult, ReadResult]) => [ReadResult, ReadResult];

export type SetupFn = () => SetupResult;
export type TeardownFn = ((state: object) => Promise<any>) | (() => Promise<any>);
export type FormatFn = (c:CompareResult) => string[];
export type JoinFn = (strs: string[]) => string;
export type ErrorFn = ((Error) => undefined )| ((Error, SetupResult) => undefined);

export type ExecutorTaskDefinition = {
  setupFn: SetupFn;
  teardownFn: TeardownFn;
  compareFn: CompareFn;
  formatFn: FormatFn,
  joinFn: JoinFn,
  transformFn: CompareFn;
  errorFn: ErrorFn,
  pauseTransform: boolean,
  readFns: [IndependentReadFn, ReadFn], // Read function for source and target databases
  retryOptions: object,
  sequentialRead: boolean, // Whether to call read
  outputPath: string
};
