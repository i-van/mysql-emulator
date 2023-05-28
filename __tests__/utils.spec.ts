import { sortBy } from '../src/utils';

describe('sortBy', () => {
  it('should sort numbers in descending order', () => {
    const arr = [1, 2, 3, 4, 5];
    const sorter = sortBy([{ mapper: (i) => i, order: -1 }]);
    const actual = arr.sort(sorter);

    expect(actual).toEqual([5, 4, 3, 2, 1]);
  });
  it('should sort numbers in descending order and strings in ascending order', () => {
    const arr = [
      { id: 1, number: 1, string: 'a' },
      { id: 2, number: 1, string: 'b' },
      { id: 3, number: 1, string: 'c' },
      { id: 4, number: 2, string: 'b' },
      { id: 5, number: 2, string: 'a' },
      { id: 6, number: 3, string: 'a' },
    ];
    const sorter = sortBy([
      { mapper: (r) => r.number, order: -1 },
      { mapper: (r) => r.string, order: 1 },
    ]);
    const actual = arr.sort(sorter);

    expect(actual).toEqual([
      { id: 6, number: 3, string: 'a' },
      { id: 5, number: 2, string: 'a' },
      { id: 4, number: 2, string: 'b' },
      { id: 1, number: 1, string: 'a' },
      { id: 2, number: 1, string: 'b' },
      { id: 3, number: 1, string: 'c' },
    ]);
  });
});
