import { Processor } from '../processor';

type Callback = (err: Error | null, res: any) => void;

export class MysqlEmulatorDriver {
  stream = {};

  constructor(private processor: Processor) {}

  // eslint-disable-next-line
  connect() {}

  // eslint-disable-next-line
  disconnect() {}

  // eslint-disable-next-line
  release() {}

  createPool() {
    return this;
  }

  end(handler: Callback) {
    if (handler) {
      handler(null, null);
    }
  }

  createConnection() {
    return this;
  }

  getConnection(handler: Callback) {
    handler(null, this);
  }

  // eslint-disable-next-line
  on() {}

  once(event: string, handler: () => void) {
    if (event === 'connect') {
      handler();
    }
  }

  // eslint-disable-next-line
  removeListener() {}

  listeners() {
    return [];
  }

  query(sql: string | { sql: string; values: any[] }, values: any[], callback?: Callback) {
    if (!callback && typeof values === 'function') {
      callback = values;
      values = [];
    }
    if (typeof sql === 'object') {
      values = sql.values;
      sql = sql.sql;
    }

    const promise = this.processor
      .process(sql, values || [])
      .then((res) => {
        if (callback) {
          setImmediate(callback, null, res);
        }
      })
      .catch((err) => {
        if (callback) {
          setImmediate(callback, err, null);
        }
      });

    const wrapPromise = (p) => {
      // eslint-disable-next-line
      p.setMaxListeners = () => {};
      return p;
    };
    return wrapPromise(promise);
  }

  execute(sql: string, values: any[], callback?: Callback) {
    return this.query(sql, values, callback);
  }
}
