export class ShowIndexesQuery {
  constructor() {}

  static fromSql(sql: string): ShowIndexesQuery | null {
    if (/SHOW (INDEX|INDEXES|KEYS)/i.test(sql)) {
      return new ShowIndexesQuery();
    }
    return null;
  }
}