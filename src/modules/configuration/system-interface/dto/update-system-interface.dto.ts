import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemInterfaceDto } from './create-system-interface.dto';

export class UpdateSystemInterfaceDto extends PartialType(
  CreateSystemInterfaceDto,
) {}
