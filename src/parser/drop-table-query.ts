export class DropTableQuery {
  constructor(public database: string | null, public table: string) {}

  static fromAst(ast: any): DropTableQuery {
    const [{ db, table }] = ast.name;
    return new DropTableQuery(db, table);
  }
}
