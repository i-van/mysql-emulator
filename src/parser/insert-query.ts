import { Insert_Replace } from 'node-sql-parser';
import { buildExpression, Expression } from './expression';

export class InsertQuery {
  constructor(
    public database: string | null,
    public table: string,
    public columns: string[] | null,
    public values: Expression[][],
  ) {}

  static fromAst(ast: Insert_Replace): InsertQuery {
    const [{ db, table }] = ast.table!;
    const values = ast.values.map(({ value }) => {
      return value.map(i => buildExpression(i, new Map()));
    });

    return new InsertQuery(db, table, ast.columns, values);
  }
}
