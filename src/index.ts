import { QueryRunner } from './query-runner';
import { Server } from './server';

const server = new Server();
const qr = new QueryRunner(server);
server.createDatabase('emulator');
server.useDatabase('emulator');

export const query = (sql, params: any[] = []) => qr.query(sql, params);
