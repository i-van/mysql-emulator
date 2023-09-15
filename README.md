[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/i-van/mysql-emulator/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/mysql-emulator.svg?style=flat-square)](https://www.npmjs.com/package/mysql-emulator)
![GitHub Workflow Status (with branch)](https://img.shields.io/github/actions/workflow/status/i-van/mysql-emulator/main.yml?style=flat-square)
[![npm downloads](https://img.shields.io/npm/dm/mysql-emulator.svg?style=flat-square)](https://www.npmjs.com/package/mysql-emulator)

# MySQL Emulator

The package emulates a MySQL database from within Node.js, specifically designed for e2e testing.

Try it out at the [playground](https://i-van.github.io/mysql-emulator/).

⚠ The library is still under active development.
It means that some features are not working and may be considered as invalid syntax or ignored.

⚠ Known limitations:
- No right join
- Default order might differ (always use `ORDER BY` when the order matters)
- Column names might differ, f.e. `count(u.id)` => ```COUNT(`u`.`id`)``` (aliases fix it)
- No timezone support

📃 TODO
- [ ] `ALTER` statement (in most cases `ALTER` even is not needed, `synchronize` will do all the work)
- [x] Foreign key constraints
- [ ] Fill `INFORMATION_SCHEMA` tables
- [x] `DELETE ORDER BY field LIMIT number`
- [x] `UPDATE ORDER BY field LIMIT number`
- [x] `SELECT GROUP BY position/alias`
- [x] `SELECT ORDER BY position/alias`
- [ ] Implement the most used functions

## Usage

Just start from:
```bash
npm install mysql-emulator
```

Then it's ready to go:
```javascript
import { query } from 'mysql-emulator';

await query(...);
```

### Examples
- [TypeORM](https://github.com/i-van/mysql-emulator/blob/main/examples/typeorm/basic.ts)
- [Sequelize](https://github.com/i-van/mysql-emulator/blob/main/examples/sequelize/basic.ts)
- [Nest + TypeORM + MySQL-emulator](https://github.com/i-van/nest-typeorm-example/blob/main/test/user.e2e-spec.ts)
