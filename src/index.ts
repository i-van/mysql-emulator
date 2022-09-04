import { QueryRunner } from './query-runner';
import { Server } from './server';

const server = new Server();
const qr = new QueryRunner(server);
server.createDatabase('default');
server.useDatabase('default');

export const query = (sql, params: any[] = []) => qr.query(sql, params);
