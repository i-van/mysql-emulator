export enum DataType {
  INT = 'INT',
  VARCHAR = 'VARCHAR',
}

export class TableColumn {
  constructor(protected name: string, protected dataType: DataType) {}
}
