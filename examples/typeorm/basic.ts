import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { createTypeormDataSource } from '../../src/adapters';

@Entity('companies')
class Company {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;
}

async function typeormBasicSample() {
  const dataSource = await createTypeormDataSource({
    type: 'mysql',
    entities: [Company],
    // driver: undefined,
    // host: 'localhost',
    // port: 3306,
    // username: 'root',
    // password: 'password',
    // database: 'mysql_emulator',
  });

  try {
    await dataSource.initialize();
    await dataSource.synchronize();
    const companyRepository = dataSource.getRepository(Company);

    const newCompany = companyRepository.create({ name: 'first' });
    await companyRepository.save(newCompany);

    const fetchedCompanies = await companyRepository.find();
    console.log(fetchedCompanies);
  } finally {
    await dataSource.close();
  }
}

typeormBasicSample().then(console.log, console.log);
