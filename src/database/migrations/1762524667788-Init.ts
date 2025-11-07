import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1762524667788 implements MigrationInterface {
  name = 'Init1762524667788';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`googleId\` varchar(255) NULL, \`linkedinId\` varchar(255) NULL, \`facebookId\` varchar(255) NULL, \`email\` varchar(255) NULL, \`fullName\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_f9740e1e654a5daddb82c60bd7\` (\`facebookId\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`magic-link\` (\`id\` varchar(36) NOT NULL, \`token\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`expiresAt\` timestamp NOT NULL, \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`markers\` (\`id\` varchar(36) NOT NULL, \`key\` varchar(100) NOT NULL, \`language\` varchar(10) NOT NULL, \`pattern\` text NOT NULL, \`category\` varchar(50) NOT NULL, \`alternativeNames\` varchar(255) NULL, \`unit\` varchar(20) NULL, \`referenceMin\` decimal(10,2) NULL, \`referenceMax\` decimal(10,2) NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_34e68a4e5b14f085ae6a669e6b\` (\`key\`), INDEX \`IDX_4dba7dc0c42f44c0bd1d46c1fe\` (\`language\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`magic-link\` ADD CONSTRAINT \`FK_8f3b8d45f76402d1cb950b62277\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`magic-link\` DROP FOREIGN KEY \`FK_8f3b8d45f76402d1cb950b62277\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4dba7dc0c42f44c0bd1d46c1fe\` ON \`markers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_34e68a4e5b14f085ae6a669e6b\` ON \`markers\``,
    );
    await queryRunner.query(`DROP TABLE \`markers\``);
    await queryRunner.query(`DROP TABLE \`magic-link\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f9740e1e654a5daddb82c60bd7\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
