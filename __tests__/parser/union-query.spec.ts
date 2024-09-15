import { Parser, SelectQuery, UnionQuery } from '../../src/parser';

describe('union query', () => {
  const parser = new Parser();

  it('should return UnionQuery', () => {
    const sql = `
      SELECT id, name FROM users
      UNION
      SELECT id, title FROM posts
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.selects.length).toEqual(2);
    expect(res.selects[0]).toBeInstanceOf(SelectQuery);
    expect(res.selects[1]).toBeInstanceOf(SelectQuery);
    expect(res.distinct).toEqual(true);
    expect(res.orderBy).toEqual([]);
    expect(res.limit).toEqual(0);
  });
  it('should parse UNION DISTINCT', () => {
    const sql = `
      (SELECT id, name FROM users)
      UNION DISTINCT
      (SELECT id, title FROM posts)
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.distinct).toEqual(true);
  });
  it('should parse UNION ALL', () => {
    const sql = `
      (SELECT id, name FROM users)
      UNION ALL
      (SELECT id, title FROM posts)
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.distinct).toEqual(false);
  });
  it('should parse mix UNIONs', () => {
    const sql = `
      (SELECT id, name FROM users)
      UNION ALL
      (SELECT id, title FROM posts)
      UNION DISTINCT
      (SELECT id, description FROM events)
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.distinct).toEqual(true);
  });
  it('should parse several UNION ALL', () => {
    const sql = `
      (SELECT id, name FROM users)
      UNION ALL
      (SELECT id, title FROM posts)
      UNION ALL
      (SELECT id, description FROM events)
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.distinct).toEqual(false);
  });
  it('should parse ORDER BY', () => {
    const sql = `
      (SELECT id, name FROM users)
      UNION
      (SELECT id, title FROM posts)
      ORDER BY name
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.orderBy).toEqual([{ type: 'column_ref', table: null, column: 'name', order: 'ASC' }]);
  });
  it('should parse LIMIT', () => {
    const sql = `
      (SELECT id, name FROM users)
      UNION
      (SELECT id, title FROM posts)
      LIMIT 10
    `;
    const res = parser.parse(sql, []) as UnionQuery;

    expect(res).toBeInstanceOf(UnionQuery);
    expect(res.limit).toEqual(10);
  });
});
