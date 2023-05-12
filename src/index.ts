import { QueryRunner } from './query-runner';
import { Server } from './server';

const server = new Server();
const qr = new QueryRunner(server);

export const query = (sql: string, params: any[] = []) => qr.query(sql, params);
export * from './driver';
