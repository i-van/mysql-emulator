import { Processor } from './processor';
import { Server } from './server';

const server = new Server();
const processor = new Processor(server);

export const query = (sql: string, params: any[] = []) => processor.process(sql, params);
export * from './driver';
