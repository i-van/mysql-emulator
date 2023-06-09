import { Parser, TransactionQuery } from '../../src/parser';

describe('transaction query', () => {
  const parser = new Parser();

  it('should return START_TRANSACTION TransactionQuery', () => {
    const res = parser.parse('START TRANSACTION', []) as TransactionQuery;

    expect(res).toBeInstanceOf(TransactionQuery);
    expect(res.statement).toBe('start');
  });
  it('should return COMMIT TransactionQuery', () => {
    const res = parser.parse('COMMIT', []) as TransactionQuery;

    expect(res).toBeInstanceOf(TransactionQuery);
    expect(res.statement).toBe('commit');
  });
  it('should return ROLLBACK TransactionQuery', () => {
    const res = parser.parse('ROLLBACK', []) as TransactionQuery;

    expect(res).toBeInstanceOf(TransactionQuery);
    expect(res.statement).toBe('rollback');
  });
});
