import { Test } from '@nestjs/testing';
import { PluginFilesService } from './plugin-files.service';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginController } from './plugin.controller';
import { PluginModule } from './plugin.module';

// Regression: PluginModule was empty (@Module({})), so /plugins routes 404'd
// ("Cannot GET /api/plugins"). Also guards against PluginLoaderService's
// string-default constructor param breaking DI.
describe('PluginModule', () => {
  it('registers the plugin controller and services', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PluginModule],
    }).compile();

    expect(moduleRef.get(PluginController)).toBeInstanceOf(PluginController);
    expect(moduleRef.get(PluginRegistryService)).toBeInstanceOf(
      PluginRegistryService,
    );
    expect(moduleRef.get(PluginFilesService)).toBeInstanceOf(
      PluginFilesService,
    );
    expect(moduleRef.get(PluginLoaderService)).toBeInstanceOf(
      PluginLoaderService,
    );
  });
});
