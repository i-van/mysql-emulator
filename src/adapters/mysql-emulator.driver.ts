import { QueryRunner } from '../query-runner';

type Callback = (err: Error | null, res: any) => void;

export class MysqlEmulatorDriver {
  constructor(private queryRunner: QueryRunner) {}

  connect() {}

  disconnect() {}

  release() {}

  createPool() {
    return this;
  }

  end() {}

  getConnection(handler) {
    handler(null, this);
  }

  on() {}

  listeners() {
    return [];
  }

  query(sql: string, values: any[], callback?: Callback) {
    this.queryRunner.query(sql, values || [])
      .then(res => {
        callback && setImmediate(callback, null, res);
      })
      .catch(err => {
        callback && setImmediate(callback, err, null);
      });
  }
}
