export type ShowStatement = 'databases' | 'tables' | 'indexes';

type StatementItem = {
  type: ShowStatement;
  regexp: RegExp;
};
const statements: StatementItem[] = [
  { type: 'databases', regexp: /show\s+(databases|schemas)/i },
  { type: 'tables', regexp: /show\s+tables/i },
  { type: 'indexes', regexp: /show\s+(index|indexes|keys)\s+(from|in)\s+(`?\w+`?)/i },
];

export class ShowQuery {
  constructor(public statement: ShowStatement) {}

  static fromSql(sql: string): ShowQuery | null {
    for (const { type, regexp } of statements) {
      if (regexp.test(sql)) {
        return new ShowQuery(type);
      }
    }
    return null;
  }
}
