import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { User } from '@database/entities/user.entity';
import { LoginToken } from '@database/entities/login-token.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as uuid from 'uuid';

jest.mock('nodemailer');
jest.mock('uuid');

describe('AuthService', () => {
    let service: AuthService;
    let loginTokenRepository: jest.Mocked<Repository<LoginToken>>;
    let jwtService: jest.Mocked<JwtService>;
    let queryRunner: jest.Mocked<QueryRunner>;

    const mockUser = { id: 'user-id', email: 'test@example.com', loginTokens: [] };
    const mockToken = {
        id: 'token-id',
        token: 'mock-token',
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: mockUser,
    };
    const mockTransporter = { sendMail: jest.fn().mockResolvedValue(undefined) };

    beforeEach(async () => {
        const mockManager: Partial<EntityManager> = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };

        queryRunner = {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
            manager: mockManager as EntityManager,
        } as unknown as jest.Mocked<QueryRunner>;

// eslint-disable-next-line @typescript-eslint/unbound-method
        (mockManager.findOne as jest.Mock).mockResolvedValue(null);
// eslint-disable-next-line @typescript-eslint/unbound-method
        (mockManager.create as jest.Mock).mockReturnValue(mockUser);
// eslint-disable-next-line @typescript-eslint/unbound-method
        (mockManager.save as jest.Mock).mockResolvedValue(mockUser);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: { sign: jest.fn().mockReturnValue('mock-jwt') },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(mockUser),
                        create: jest.fn().mockReturnValue(mockUser),
                        save: jest.fn().mockResolvedValue(mockUser),
                    },
                },
                {
                    provide: getRepositoryToken(LoginToken),
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(null),
                        create: jest.fn().mockReturnValue(mockToken),
                        save: jest.fn().mockResolvedValue(mockToken),
                        remove: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get(JwtService);
        loginTokenRepository = module.get(getRepositoryToken(LoginToken));

        (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
        (uuid.v4 as jest.Mock).mockReturnValue('mock-token');
    });

    describe('sendMagicLink', () => {
        it('should send magic link and return message', async () => {
// eslint-disable-next-line @typescript-eslint/unbound-method
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockUser);
            const result = await service.sendMagicLink('test@example.com');
            expect(result).toEqual({ message: 'Sign-in link sent to test@example.com' });
            expect(queryRunner.connect).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });

        it('should throw BadRequestException for invalid email', async () => {
            await expect(service.sendMagicLink('invalid')).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('verifyToken', () => {
        it('should verify token and return JWT', async () => {
// eslint-disable-next-line @typescript-eslint/unbound-method
            loginTokenRepository.findOne.mockResolvedValue(mockToken);
            const result = await service.verifyToken('mock-token', 'test@example.com');
            expect(result).toEqual({ accessToken: 'mock-jwt' });
            expect(jwtService.sign).toHaveBeenCalled();
            expect(loginTokenRepository.remove).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for invalid token', async () => {
// eslint-disable-next-line @typescript-eslint/unbound-method
            loginTokenRepository.findOne.mockResolvedValue(null);
            await expect(
                service.verifyToken('invalid-token', 'test@example.com'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});