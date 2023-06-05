import { From, Update } from 'node-sql-parser';
import { buildExpression, Expression } from './expression';

type Assignment = {
  table: string | null;
  column: string;
  value: Expression;
};

export class UpdateQuery {
  constructor(
    public database: string | null,
    public table: string,
    public alias: string | null,
    public assignments: Assignment[],
    public where: Expression | null,
  ) {}

  static fromAst(ast: Update): UpdateQuery {
    const [{ db, table, as }] = ast.table as From[];

    const assignments: Assignment[] = ast.set.map((s) => ({
      table: s.table,
      column: s.column,
      value: buildExpression(s.value),
    }));

    return new UpdateQuery(db, table, as, assignments, ast.where ? buildExpression(ast.where) : null);
  }
}
