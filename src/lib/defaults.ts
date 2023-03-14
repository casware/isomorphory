import { CompareResult } from './types';

/**
 * Converts an object into a formatted string. For this function to work properly with unstringifyObject,
 * the object's properties and values should be strings which do not contain private unicode characters '\uE880' or '\uE881'.
 * @param {object} obj An object with strings for values
 * @returns {string} A string with concatenated object properties/values. For example, the object { prop1: val1, prop2: val2} will be mapped to the string 'prop1#val1@prop2#val2'.
 */
export function stringifyObject(obj: object): string {
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
export function unstringifyObject(str: string): object {
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
 * @returns {[string[], string[], number]} Returns an array that contains two arrays of strings, and a number representing the number of identical elements in the parameters.
 * The first array contains strings which are present in `a` and not present in `b`.
 * The second array contains strings present in `b` but not in `a`.
 */
export function getArrayDiffs([a, b]: [string[], string[], number]): [
  string[],
  string[],
  number
] {
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
 * The default comparison function applied by `createDataTransform` and `createPausedDataTransform` to data chunks.
 * It expects an array parameter. The first two elements of this array should be arrays of objects and the third element a number.
 * The first(second) object array represent a chunk of data from the source (destination) datastore.
 * The number stores the number of matching elements found between source/destination so far.
 * This allows for storing the differences in cases of mis-aligned result sets from data stores.
 * The function returns a value in the same format after comparing the chunks.
 * @param {[object[], object[], number]} tuple A 3-tuple containing two arrays and a number.
 * @returns {[object[], object[], number]} A 3-tuple containing two arrays and a number. 
 * The first array is made up of the elements that are `missing`: present
 * in the first array but not the second. The second array is made up of the elements that 
 * are `extraneous`: present in the second array but not the first.
 * The third entry in the tuple is the `match` count: the number of elements that are
 * present in both arrays.
 */
export function defaultCompareFn([
  a,
  b,
  previousMatches
]: CompareResult): CompareResult {
  const stringified = [a.map(stringifyObject), b.map(stringifyObject), previousMatches];
  const [missing, extra, matches] = getArrayDiffs(stringified as [string[], string[], number]);
  return [
    missing.map(unstringifyObject),
    extra.map(unstringifyObject),
    previousMatches + matches
  ];
}

export function defaultFormatFn([missing, extraneous, matches]: [
  object[],
  object[],
  number
]): string[] {
  return [
    missing.map(
      (missingComp) => JSON.stringify(missingComp).slice(1, -1) + ',"missing"'
    ),
    extraneous.map(
      (extra) => JSON.stringify(extra).slice(1, -1) + ',"extraneous"'
    ),
    `"matches": ${matches}`
  ].flat();
}
