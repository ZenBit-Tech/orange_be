import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { markers } from '@common/constants';
config();

//this is for developers only to push into db all markers
async function seed() {
  const dataSource = new DataSource({
    type: 'mysql' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ailab',
    synchronize: true,
  });

  try {
    await dataSource.initialize();

    const result: Array<{ count: number }> = await dataSource.query(
      'SELECT COUNT(*) as count FROM markers WHERE isActive = 1',
    );

    const count = result[0].count;

    if (count > 0) {
      console.log(`  Database already has ${count} markers`);
      console.log('   To re-seed, first clear: DELETE FROM markers;\n');
      await dataSource.destroy();
      return;
    }

    let inserted = 0;

    for (const m of markers) {
      await dataSource.query(
        `INSERT INTO markers (id, \`key\`, language, pattern, category, alternativeNames, unit, referenceMin, referenceMax, isActive, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [m.key, m.lang, m.pattern, m.cat, m.names, m.unit, m.min, m.max],
      );
      inserted++;
      if (inserted % 10 === 0) {
        process.stdout.write(`   Progress: ${inserted}/${markers.length}\r`);
      }
    }

    console.log(`   TOTAL: ${inserted} markers\n`);
    await dataSource.destroy();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('\n Error:', errorMessage);
    process.exit(1);
  }
}

void seed();
