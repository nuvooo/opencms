import { TransactionService } from '@/database';
import { Otp } from '@/features/auth/entities/otp.entity';
import { Session } from '@/features/auth/entities/session.entity';
import { MailService } from '@/features/mail/mail.service';
import { Profile } from '@/features/users/entities/profile.entity';
import { User } from '@/features/users/entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';

jest.mock('@/common/utils', () => ({
  ...jest.requireActual('@/common/utils'),
  generateOTP: jest.fn().mockResolvedValue('654321'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let otpRepository: Repository<Otp>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule, ConfigModule],
      providers: [
        AuthService,
        JwtService,
        ConfigService,
        {
          provide: MailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Profile),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Session),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Otp),
          useClass: Repository,
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(), // mock any methods you use
          },
        },
        {
          provide: TransactionService,
          useValue: {
            runInTransaction: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    otpRepository = module.get(getRepositoryToken(Otp));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resendEmailConfirmation', () => {
    const user = {
      email: 'alice@example.com',
      isEmailVerified: false,
      profile: { name: 'Alice' },
    } as unknown as User;

    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(otpRepository, 'delete').mockResolvedValue({} as never);
      jest
        .spyOn(otpRepository, 'create')
        .mockImplementation((dto) => dto as never);
      jest
        .spyOn(otpRepository, 'save')
        .mockImplementation(async (dto) => dto as never);
    });

    it('only deletes confirmation OTPs for the requesting email, not globally', async () => {
      await service.resendEmailConfirmation({ email: 'alice@example.com' });

      expect(otpRepository.delete).toHaveBeenCalledWith({
        type: 'EMAIL_CONFIRMATION',
        email: 'alice@example.com',
      });
    });

    it('binds the new OTP to the requesting email', async () => {
      await service.resendEmailConfirmation({ email: 'alice@example.com' });

      expect(otpRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EMAIL_CONFIRMATION',
          email: 'alice@example.com',
        }),
      );
    });
  });

  describe('confirmEmail', () => {
    it('matches the OTP scoped to the email so a code cannot confirm another address', async () => {
      const user = {
        email: 'alice@example.com',
        isEmailVerified: false,
        profile: { name: 'Alice' },
      } as unknown as User;
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      const findOneOtp = jest
        .spyOn(otpRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(
        service.confirmEmail({ email: 'alice@example.com', token: '123456' }),
      ).rejects.toThrow();

      expect(findOneOtp).toHaveBeenCalledWith({
        where: {
          otp: '123456',
          type: 'EMAIL_CONFIRMATION',
          email: 'alice@example.com',
        },
      });
    });
  });
});
