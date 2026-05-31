import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateSystemInterfaceDto } from './dto/create-system-interface.dto';
import { UpdateSystemInterfaceDto } from './dto/update-system-interface.dto';
import { SystemInterfaceService } from './system-interface.service';

@ApiTags('configuration', 'system-interface')
@Controller('configuration/system-interface')
export class SystemInterfaceController {
  constructor(private readonly service: SystemInterfaceService) {}

  @Post()
  create(@Body() dto: CreateSystemInterfaceDto) {
    return this.service.create(dto);
  }

  @Get()
  findOne() {
    return this.service.findOne();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSystemInterfaceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
