import { Test } from '@nestjs/testing';
import { SetupEnvService } from './setup-env.service';

// Regression: SetupEnvService has a constructor parameter with a default value
// (`envPath: string = ...`). Nest ignores defaults and tries to inject a String
// provider unless the parameter is marked @Optional(), which crashed app boot.
describe('SetupEnvService (DI)', () => {
  it('is resolvable by the Nest container without an injectable env path', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SetupEnvService],
    }).compile();

    expect(moduleRef.get(SetupEnvService)).toBeInstanceOf(SetupEnvService);
  });
});
