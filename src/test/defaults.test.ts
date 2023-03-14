import {
  defaultCompareFn,
  defaultFormatFn,
  getArrayDiffs,
  stringifyObject,
  unstringifyObject
} from '../lib/defaults';

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

    test('correctly marks object as missing/extraneous', function () {
      const a = [
        { m: '1', n: '2' },
        { m: '8', n: '9' }
      ];
      const b = [
        { n: '2', m: '1' },
        { m: '8', n: '10' }
      ];
      const missing = [{ m: '8', n: '9' }];
      const extraneous = [{ m: '8', n: '10' }];
      const expected = [missing, extraneous, 1];
      const actual = defaultCompareFn([a, b, 0]);
      expect(actual).toEqual(expected);
    });

    test('correctly handles objects with special characters', function () {
      const a = [
        { m: '1@1', n: '2', longAttributeName: '!!!@#$%^&*`"' },
        { m: '8', n: '9' }
      ];
      const b = [
        { n: '2', m: '1@1', longAttributeName: '!!!@#$%^&*`"' },
        { m: '8', n: '10' }
      ];
      const missing = [{ m: '8', n: '9' }];
      const extraneous = [{ m: '8', n: '10' }];
      const expected = [missing, extraneous, 1];
      const actual = defaultCompareFn([a, b, 0]);
      expect(actual).toEqual(expected);
    });

    test('correctly increments match number if there are previous matches', function () {
      const a = [
        { m: '1@1', n: '2', longAttributeName: '!!!@#$%^&*`"' },
        { m: '8', n: '9' }
      ];
      const b = [
        { n: '2', m: '1@1', longAttributeName: '!!!@#$%^&*`"' },
        { m: '8', n: '10' }
      ];
      const missing = [{ m: '8', n: '9' }];
      const extraneous = [{ m: '8', n: '10' }];
      const expected = [missing, extraneous, 11];
      const actual = defaultCompareFn([a, b, 10]);
      expect(actual).toEqual(expected);
    });
  });

  describe('defaultFormatFn', function () {
    test('formats missing and extraneous values correctly', function () {
      const input: [object[], object[], number] = [
        [{ a: '1', b: '2' }],
        [{ c: '1', d: '2' }],
        4
      ];
      const expected = [
        '"a":"1","b":"2","missing"',
        '"c":"1","d":"2","extraneous"',
        '"matches":"4"'
      ];
      const actual = defaultFormatFn(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('getArrayDiffs', function () {
    test('returns missing and extraneous arrays when arguments have the same entries', function () {
      const a1 = ['1', '2', '3'];
      const a2 = ['2', '3', '4'];
      const expected = [['1'], ['4'], 2];
      const actual = getArrayDiffs([a1, a2]);
      expect(actual).toEqual(expected);
    });

    test('handles empty arrays', function () {
      const expected = [[], [], 0];
      const actual = getArrayDiffs([[], []]);
      expect(actual).toEqual(expected);
    });

    test('ignores duplicate entries in arrays', function () {
      const a1 = ['1', '1', '2', '3']; // Duplicate a non-matching entry
      const a2 = ['2', '3', '3', '4', '4'];
      const expected = [['1'], ['4'], 2];
      const actual = getArrayDiffs([a1, a2]);
      expect(actual).toEqual(expected);

      // Arrays which are the same except for duplicates are handled
      const a3 = ['1', '1', '1'];
      const a4 = ['1'];
      const expected2 = [[], [], 1];
      const actual2 = getArrayDiffs([a3, a4]);
      expect(actual2).toEqual(expected2);
    });
  });

  describe('stringifyObject', function () {
    test('returns the expected string', function () {
      const obj = { enrollmentSessionBid: 'bid-1', entityBid: 'bid-2' };
      const expected =
        'enrollmentSessionBid\uE880bid-1\uE881entityBid\uE880bid-2';
      expect(stringifyObject(obj)).toEqual(expected);
    });

    test('returns the same results for objects with properties in different orders', function () {
      const expected = 'a\uE8801\uE881b\uE8802\uE881c\uE8803';
      expect(stringifyObject({ a: '1', b: '2', c: '3' })).toEqual(expected);
      expect(stringifyObject({ b: '2', a: '1', c: '3' })).toEqual(expected);
      expect(stringifyObject({ c: '3', a: '1', b: '2' })).toEqual(expected);
    });

    test('returns an empty string when passed an empty object', function () {
      const expected = '';
      expect(stringifyObject({})).toEqual('');
      expect(stringifyObject({})).toEqual(stringifyObject({}));
    });

    test('returns the expected string when an email is used', function () {
      const obj = {
        enrollmentSessionBid: 'bid-1',
        externalId: 'Larry.david@nwea.org'
      };
      const expected =
        'enrollmentSessionBid\uE880bid-1\uE881externalId\uE880Larry.david@nwea.org';
      expect(stringifyObject(obj)).toEqual(expected);
    });
  });

  describe('unstringifyObject', function () {
    test('returns the expected object', function () {
      const expected = { a: '1', b: '2' };
      expect(unstringifyObject('a\uE8801\uE881b\uE8802')).toEqual(expected);
    });

    test('returns an empty object for the empty string', function () {
      expect(unstringifyObject('')).toEqual({});
    });

    test('inverts stringifyObject for objects with string values', function () {
      const o1 = { a: '1', b: '2' };
      expect(unstringifyObject(stringifyObject(o1))).toEqual(o1);
    });

    test('inverts stringifyObject for empty objects', function () {
      const o2 = {};
      expect(unstringifyObject(stringifyObject(o2))).toEqual(o2);
    });

    test('returns expected values for objects with null or undefined properties', function () {
      const o3 = { a: null, b: undefined };
      expect(unstringifyObject(stringifyObject(o3))).toEqual({
        a: 'null',
        b: 'undefined'
      });
    });

    test('returns the expected string when an email is used', function () {
      const expected = {
        enrollmentSessionBid: 'bid-1',
        externalId: 'Larry.david@nwea.org'
      };
      expect(
        unstringifyObject(
          'enrollmentSessionBid\uE880bid-1\uE881externalId\uE880Larry.david@nwea.org'
        )
      ).toEqual(expected);
    });
  });
});
