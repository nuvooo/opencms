import { Public } from '@/common/decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { SetupStatusResponse } from './dto/setup-status.response';
import { ValidateDbDto } from './dto/validate-db.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  status(): SetupStatusResponse {
    return this.setupService.getStatus();
  }

  @Public()
  @Post('validate-db')
  async validateDb(@Body() dto: ValidateDbDto): Promise<{ ok: true }> {
    await this.setupService.validateDatabase(dto);
    return { ok: true };
  }

  @Public()
  @Post('bootstrap')
  async bootstrap(
    @Body() dto: BootstrapSetupDto,
  ): Promise<{ message: 'Installation completed' }> {
    await this.setupService.bootstrap(dto);
    return { message: 'Installation completed' };
  }
}
