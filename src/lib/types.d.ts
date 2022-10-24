/**
 * 3-tuple of object array representing source data, object array of destination data,
 * number of matching objects
 */
export type SetupResult = Promise<object>;
export type DefaultCompareResult = [object[], object[], number]
export type CompareResult = DefaultCompareResult;
export type CompareFn = (tr: CompareResult) => CompareResult;

export type DefaultReadPromise = Promise<object[]>;
export type ReadPromise = DefaultReadPromise | Promise<any>;
export type IndependentReadFn = (() => ReadPromise );
export type DependentReadFn = ((r?: ReadPromise) => ReadPromise);
export type ReadFn = IndependentReadFn | DependentReadFn;

export type TransformFn = (r: [Await<DefaultReadPromise>, Await<DefaultReadPromise>]) => [Await<DefaultReadPromise>, Await<ReadDefaultReadPromiseromise>];

export type SetupFn = () => SetupResult;
export type TeardownFn = ((state?: object) => Promise<any>) | (() => Promise<any>);
export type FormatFn = (c:CompareResult) => string[];
export type JoinFn = (strs: string[]) => string;
export type ErrorFn = ((e:Error, s?:SetupResult) => void);

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
