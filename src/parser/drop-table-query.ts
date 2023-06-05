export class DropTableQuery {
  constructor(public database: string | null, public table: string, public ifExists: boolean) {}

  static fromAst(ast: any): DropTableQuery {
    const [{ db, table }] = ast.name;
    const ifExists = ast.prefix === 'if exists';
    return new DropTableQuery(db, table, ifExists);
  }
}
