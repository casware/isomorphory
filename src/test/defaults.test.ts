import { defaultCompareFn } from '../lib/defaults';

describe('lib/defaults.ts', function () {
  describe('defaultCompareFn', function () {
    test('correctly matches equivalent objects with different attribute orders', function () {
      const a = [
        { m: '1', n: '2' },
        { m: '8', n: '9' }
      ];
      const b = [
        { n: '2', m: '1' },
        { m: '8', n: '9' }
      ];
      const expected = [[], [], 2];
      const actual = defaultCompareFn([a, b, 0]);
      expect(actual).toEqual(expected);
    });
  });
});
