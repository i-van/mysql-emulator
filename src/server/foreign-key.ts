import { ColumnRef, ForeignKeyConstraintAction } from '../parser';
import { Table } from './table';
import { ServerException } from './server.exception';

export class ForeignKey {
  private definition = this.buildDefinition();
  private placeholder = this.columns.reduce((p, c) => ({ ...p, [c.column]: null }), {});

  constructor(
    protected name: string,
    protected table: Table,
    protected columns: ColumnRef[],
    protected referenceTable: Table,
    protected referenceColumns: ColumnRef[],
    protected onUpdate: ForeignKeyConstraintAction,
    protected onDelete: ForeignKeyConstraintAction,
  ) {}

  getTable() {
    return this.table;
  }

  checkParentRowExistence(childRow: object): void {
    for (const [_id, parentRow] of this.referenceTable.getRows()) {
      if (this.isReference(parentRow, childRow)) {
        return;
      }
    }
    throw new ServerException({
      message: `Cannot add or update a child row: a foreign key constraint fails ${this.definition}`,
      code: 'REFERENCE_NOT_FOUND',
    });
  }

  updateChildRows(parentRow: object, updatedParentRow: object): void {
    for (const [id, childRow] of this.table.getRows()) {
      if (!this.isReference(parentRow, childRow)) {
        continue;
      }
      if (
        this.onUpdate === 'no action' ||
        this.onUpdate === 'restrict' ||
        this.onUpdate === 'set default' ||
        this.onUpdate === null
      ) {
        throw new ServerException({
          message: `Cannot delete or update a parent row: a foreign key constraint fails ${this.definition}`,
          code: 'REFERENCE_NOT_FOUND',
        });
      } else if (this.onUpdate === 'cascade') {
        this.table.updateRow(
          id,
          {
            ...childRow,
            ...this.columns.reduce(
              (p, c, i) => ({
                ...p,
                [c.column]: updatedParentRow[this.referenceColumns[i].column],
              }),
              {},
            ),
          },
          false,
        );
      } else if (this.onUpdate === 'set null') {
        this.table.updateRow(id, {
          ...childRow,
          ...this.placeholder,
        });
      }
    }
  }

  deleteChildRows(parentRow: object): void {
    for (const [id, childRow] of this.table.getRows()) {
      if (!this.isReference(parentRow, childRow)) {
        continue;
      }
      if (
        this.onDelete === 'no action' ||
        this.onDelete === 'restrict' ||
        this.onDelete === 'set default' ||
        this.onDelete === null
      ) {
        throw new ServerException({
          message: `Cannot delete or update a parent row: a foreign key constraint fails ${this.definition}`,
          code: 'REFERENCE_NOT_FOUND',
        });
      } else if (this.onDelete === 'cascade') {
        this.table.deleteRow(id);
      } else if (this.onDelete === 'set null') {
        this.table.updateRow(id, {
          ...childRow,
          ...this.placeholder,
        });
      }
    }
  }

  private isReference(parent: object, child: object): boolean {
    return this.columns.every((c, i) => {
      return parent[this.referenceColumns[i].column] === child[c.column] || child[c.column] === null;
    });
  }

  private buildDefinition(): string {
    const escape = (s: string) => '`' + s + '`';
    const escapeColumnNames = (columns: ColumnRef[]) => columns.map((c) => escape(c.column)).join(', ');

    return (
      `(${escape(this.table.getName())}, CONSTRAINT ${escape(this.name)} ` +
      `FOREIGN KEY (${escapeColumnNames(this.columns)}) ` +
      `REFERENCES ${escape(this.referenceTable.getName())} (${escapeColumnNames(this.referenceColumns)})` +
      (this.onDelete && this.onDelete !== 'set default' ? ' ON DELETE ' + this.onDelete.toUpperCase() : '') +
      (this.onUpdate && this.onUpdate !== 'set default' ? ' ON UPDATE ' + this.onUpdate.toUpperCase() : '') +
      `)`
    );
  }
}
