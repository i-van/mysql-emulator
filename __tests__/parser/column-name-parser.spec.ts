import { parseColumnNames } from '../../src/parser';

describe('column name parser', () => {
  it('should parse column names for expressions', () => {
    const sql = 'SELECT 1 + 1 c1, 2*1 as `c2`, 5 -3';
    const res = parseColumnNames(sql);

    expect(res).toEqual(['1 + 1', '2*1', '5 -3']);
  });
  it('should parse column names for functions', () => {
    const sql = 'SELECT count(*) c1, count(id) as `c2`, SUM(id) FROM users';
    const res = parseColumnNames(sql);

    expect(res).toEqual(['count(*)', 'count(id)', 'SUM(id)']);
  });
  it('should parse column names for primitives', () => {
    const sql = `SELECT 1, 'two', null`;
    const res = parseColumnNames(sql);

    expect(res).toEqual(['1', 'two', 'NULL']);
  });
  it('should parse column names for sub query', () => {
    const sql = `SELECT (SELECT 1) n1, (SELECT 'two') n2`;
    const res = parseColumnNames(sql);

    expect(res).toEqual(['(SELECT 1)', `(SELECT 'two')`]);
  });
  it('should parse column names for wrapped query', () => {
    const sql = `(SELECT 3, version())`;
    const res = parseColumnNames(sql);

    expect(res).toEqual(['3', 'version()']);
  });
});
