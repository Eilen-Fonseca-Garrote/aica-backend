import { Module } from '@nestjs/common';
import { ResourceStorageController } from './resource-storage.controller';
import { ResourceStorageService } from './resource-storage.service';

@Module({
  controllers: [ResourceStorageController],
  providers: [ResourceStorageService],
  exports: [ResourceStorageService],
})
export class ResourceStorageModule {}
