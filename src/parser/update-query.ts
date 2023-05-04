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
    public assignments: Assignment[],
    public where: Expression | null,
  ) {}

  static fromAst(ast: Update): UpdateQuery {
    const [{ db, table, as }] = ast.table as From[];
    const tableAliases = new Map<string, string>();
    as && tableAliases.set(as, table);

    const assignments: Assignment[] = ast.set.map((s) => ({
      table: s.table,
      column: s.column,
      value: buildExpression(s.value, tableAliases),
    }));

    return new UpdateQuery(
      db,
      table,
      assignments,
      ast.where ? buildExpression(ast.where, tableAliases) : null,
    );
  }
}
