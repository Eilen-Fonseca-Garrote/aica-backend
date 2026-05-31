import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceStorageModule } from '../../resource-storage/resource-storage.module';
import { SystemInterfaceEntity } from './entities/system-interface.entity';
import { SystemInterfaceController } from './system-interface.controller';
import { SystemInterfaceService } from './system-interface.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemInterfaceEntity]),
    ResourceStorageModule,
  ],
  controllers: [SystemInterfaceController],
  providers: [SystemInterfaceService],
})
export class SystemInterfaceModule {}
