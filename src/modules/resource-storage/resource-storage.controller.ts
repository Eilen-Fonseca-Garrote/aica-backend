import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ResourceStorageService,
  type UploadedResourceFile,
} from './resource-storage.service';

@ApiTags('resources')
@Controller('resources')
export class ResourceStorageController {
  constructor(private readonly service: ResourceStorageService) {}

  @Get(':name')
  async get(@Param('name') name: string, @Res() res: Response) {
    const resource = await this.service.download(name);

    res.setHeader('Content-Type', resource.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${resource.key}"`);

    resource.stream.pipe(res);
  }

  @Post(':name')
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(FileInterceptor('file'))
  async post(
    @Param('name') name: string,
    @UploadedFile() file: UploadedResourceFile,
  ) {
    const resource = await this.service.upload(name, file);
    return { key: resource.key };
  }

  @Delete(':name')
  async delete(@Param('name') name: string) {
    await this.service.delete(name);
    return { deleted: true };
  }
}
