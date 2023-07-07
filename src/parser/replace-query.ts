import { Insert_Replace } from 'node-sql-parser';
import { buildExpression, Expression } from './expression';

export class ReplaceQuery {
  constructor(
    public database: string | null,
    public table: string,
    public columns: string[] | null,
    public values: Expression[][],
  ) {}

  static fromAst(ast: Insert_Replace): ReplaceQuery {
    const [{ db, table }] = ast.table!;
    const values = ast.values.map(({ value }) => {
      return value.map(buildExpression);
    });

    return new ReplaceQuery(db, table, ast.columns, values);
  }
}
