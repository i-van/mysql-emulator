export enum TransactionStatement {
  START_TRANSACTION = 'START_TRANSACTION',
  COMMIT = 'COMMIT',
  ROLLBACK = 'ROLLBACK',
}

const statements = [
  { type: TransactionStatement.START_TRANSACTION, regexp: /start transaction/i },
  { type: TransactionStatement.COMMIT, regexp: /commit/i },
  { type: TransactionStatement.ROLLBACK, regexp: /rollback/i },
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
