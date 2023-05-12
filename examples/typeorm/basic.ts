import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { createTypeormDataSource } from '../../src/typeorm';

@Entity('companies')
class Company {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;
}

async function typeormBasicExample() {
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

    // insert
    const company1 = companyRepository.create({ name: 'first' });
    const company2 = companyRepository.create({ name: 'second' });
    const company3 = companyRepository.create({ name: 'third' });
    await companyRepository.save([company1, company2, company3]);
    console.log(await companyRepository.find());

    // update
    const firstCompany = await companyRepository.findOne({
      where: { name: 'first' },
    });
    if (firstCompany) {
      firstCompany.name = 'updated';
      await companyRepository.save(firstCompany);
    }
    console.log(await companyRepository.find());

    // delete
    await companyRepository.delete({ name: 'second' });
    console.log(await companyRepository.find());
  } finally {
    await dataSource.close();
  }
}

typeormBasicExample().then(console.log, console.log);
