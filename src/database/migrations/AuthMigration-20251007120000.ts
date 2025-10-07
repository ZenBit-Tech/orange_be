import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AuthMigration implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        isUnique: true,
                        isNullable: false,
                    },
                ],
                indices: [{ columnNames: ['email'] }],
            }),
            true,
        );

        await queryRunner.createTable(
            new Table({
                name: 'login_tokens',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'token',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'expiry',
                        type: 'datetime',
                        isNullable: false,
                    },
                    {
                        name: 'user_id',
                        type: 'varchar',
                        isNullable: false,
                    },
                ],
                indices: [{ columnNames: ['token'] }],
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'login_tokens',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('login_tokens', true);
        await queryRunner.dropTable('users', true);
    }
}