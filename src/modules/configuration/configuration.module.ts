import { Module } from '@nestjs/common';
import { SystemInterfaceModule } from './system-interface/system-interface.module';

@Module({
  imports: [SystemInterfaceModule],
  exports: [SystemInterfaceModule],
})
export class ConfigurationModule {}
