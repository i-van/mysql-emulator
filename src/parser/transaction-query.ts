export type TransactionStatement = 'start' | 'commit' | 'rollback';

type StatementItem = {
  type: TransactionStatement;
  regexp: RegExp;
};
const statements: StatementItem[] = [
  { type: 'start', regexp: /start transaction/i },
  { type: 'commit', regexp: /commit/i },
  { type: 'rollback', regexp: /rollback/i },
];

export class TransactionQuery {
  constructor(public statement: TransactionStatement) {}

  static fromSql(sql: string): TransactionQuery | null {
    for (const { type, regexp } of statements) {
      if (regexp.test(sql)) {
        return new TransactionQuery(type);
      }
    }
    return null;
  }
}
