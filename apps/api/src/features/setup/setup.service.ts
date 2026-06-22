import { TransactionService } from '@/database';
import { Profile } from '@/features/users/entities/profile.entity';
import { User } from '@/features/users/entities/user.entity';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from 'pg';
import { Repository } from 'typeorm';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { SetupStatusResponse } from './dto/setup-status.response';
import { ValidateDbDto } from './dto/validate-db.dto';
import { SetupState } from './entities/setup-state.entity';
import { SetupEnvService } from './setup-env.service';
import { SETUP_STATE_ID } from './setup.constants';

export class LockedException extends HttpException {
  constructor(message: string) {
    super(message, 423);
  }
}

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(SetupState)
    private readonly stateRepo: Repository<SetupState>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tx: TransactionService,
    private readonly envService: SetupEnvService,
  ) {}

  async getStatus(): Promise<SetupStatusResponse> {
    const state = await this.getOrCreateState();
    return {
      initialized: state.is_initialized,
      inProgress: state.setup_in_progress,
    };
  }

  async validateDatabase(dto: ValidateDbDto): Promise<void> {
    const client = new Client({
      host: dto.host,
      port: Number(dto.port),
      user: dto.username,
      password: dto.password,
      database: dto.name,
      ssl: dto.ssl ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
    } catch {
      throw new BadRequestException('Database connection failed');
    } finally {
      await client.end().catch(() => null);
    }
  }

  async bootstrap(dto: BootstrapSetupDto): Promise<void> {
    const state = await this.getOrCreateState();

    if (state.is_initialized) {
      throw new ConflictException('Already initialized');
    }

    if (state.setup_in_progress) {
      throw new LockedException('Setup in progress');
    }

    state.setup_in_progress = true;
    await this.stateRepo.save(state);

    try {
      await this.validateDatabase(dto.database);

      this.envService.writeAllowlisted({
        ALLOW_CORS_URL: dto.app.allowCorsUrl,
        AUTH_SECRET: dto.app.authSecret,
        AUTH_URL: dto.app.authUrl,
        DB_HOST: dto.database.host,
        DB_PORT: dto.database.port,
        DB_USERNAME: dto.database.username,
        DB_PASSWORD: dto.database.password,
        DB_NAME: dto.database.name,
        DB_SSL: String(dto.database.ssl),
      });

      await this.createAdmin(dto.admin.email, dto.admin.password);

      state.is_initialized = true;
      state.setup_in_progress = false;
      state.initialized_at = new Date();
      await this.stateRepo.save(state);
    } catch (error) {
      state.setup_in_progress = false;
      await this.stateRepo.save(state);
      throw error;
    }
  }

  private async createAdmin(email: string, password: string): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Admin email already exists');
    }

    await this.tx.runInTransaction(async (manager) => {
      const user = manager.create(User, {
        email,
        password,
        role: 'ADMIN',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });
      const savedUser = await manager.save(User, user);

      const profile = manager.create(Profile, {
        user_id: savedUser.id,
        name: email.split('@')[0],
      });
      await manager.save(Profile, profile);
    });
  }

  private async getOrCreateState(): Promise<SetupState> {
    const existing = await this.stateRepo.findOne({
      where: { id: SETUP_STATE_ID },
    });
    if (existing) {
      return existing;
    }

    const state = this.stateRepo.create({
      id: SETUP_STATE_ID,
      is_initialized: false,
      setup_in_progress: false,
      initialized_at: null,
    });

    return this.stateRepo.save(state);
  }
}
