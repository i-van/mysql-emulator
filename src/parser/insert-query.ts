import { Insert_Replace } from 'node-sql-parser';
import { buildExpression, Expression } from './expression';
import { Assignment } from './update-query';

export class InsertQuery {
  constructor(
    public database: string | null,
    public table: string,
    public columns: string[] | null,
    public values: Expression[][],
    public onDuplicateUpdate: Assignment[],
  ) {}

  static fromAst(ast: Insert_Replace): InsertQuery {
    const [{ db, table }] = ast.table!;
    const values = ast.values.map(({ value }) => {
      return value.map(buildExpression);
    });
    const onDuplicateUpdate = ((ast as any).on_duplicate_update?.set || []).map((s) => ({
      table: s.table,
      column: s.column,
      value: buildExpression(s.value),
    }));

    return new InsertQuery(db, table, ast.columns, values, onDuplicateUpdate);
  }
}
