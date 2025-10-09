import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { SendLinkDto } from '@modules/auth/dto/send-link.dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: jest.Mocked<AuthService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        sendMagicLink: jest.fn(),
                        verifyToken: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get(AuthService);
    });

    describe('sendMagicLink', () => {
        it('should call sendMagicLink and return result', async () => {
            const dto: SendLinkDto = { email: 'test@example.com' };
            const result = { message: 'Sign-in link sent to test@example.com' };
            // eslint-disable-next-line @typescript-eslint/unbound-method
            (authService.sendMagicLink as jest.Mock).mockResolvedValue(result);

            const response = await controller.sendMagicLink(dto);
            expect(response).toEqual(result);
        });

        it('should throw BadRequestException for invalid email', async () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            (authService.sendMagicLink as jest.Mock).mockRejectedValue(new BadRequestException('Invalid email'));
            await expect(controller.sendMagicLink({ email: 'invalid' })).rejects.toThrow(BadRequestException);
        });
    });

    describe('verifyToken', () => {
        it('should call verifyToken and return JWT', async () => {
            const result = { accessToken: 'mock-jwt' };
            // eslint-disable-next-line @typescript-eslint/unbound-method
            (authService.verifyToken as jest.Mock).mockResolvedValue(result);
            const response = await controller.verifyToken('mock-token', 'test@example.com');
            expect(response).toEqual(result);
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            (authService.verifyToken as jest.Mock).mockRejectedValue(new UnauthorizedException('Expired or invalid token'));
            await expect(controller.verifyToken('invalid-token', 'test@example.com')).rejects.toThrow(UnauthorizedException);
        });
    });
});