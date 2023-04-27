export class DropTableQuery {
  constructor(public database: string, public table: string) {}

  static fromAst(ast: any): DropTableQuery {
    const [{ db, table }] = ast.name;
    return new DropTableQuery(db, table);
  }
}
