import { query } from '../src';

describe('select', () => {
  describe('database', () => {
    it('should select database', async () => {
      const res = await query(`SELECT database()`);

      expect(res).toEqual([
        { 'database()': 'primary' },
      ]);
    });

    it('should select alias to database', async () => {
      const res = await query(`SELECT database() as name`);

      expect(res).toEqual([
        { 'name': 'primary' },
      ]);
    });
  });

  describe('version', () => {
    it('should select version', async () => {
      const res = await query(`SELECT version()`);

      expect(res).toEqual([
        { 'version()': expect.any(String) },
      ]);
    });

    it('should select alias to version', async () => {
      const res = await query(`SELECT version() as v`);

      expect(res).toEqual([
        { 'v': expect.any(String) },
      ]);
    });
  });
});
