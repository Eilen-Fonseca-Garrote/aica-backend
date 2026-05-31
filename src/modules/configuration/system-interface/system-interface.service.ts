import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ResourceStorageService } from '../../resource-storage/resource-storage.service';
import { CreateSystemInterfaceDto } from './dto/create-system-interface.dto';
import { UpdateSystemInterfaceDto } from './dto/update-system-interface.dto';
import { SystemInterfaceEntity } from './entities/system-interface.entity';

export const DEFAULT_SYSTEM_INTERFACE_CONFIG = {
  logo: '/img/aica-logo.jpg',
  favicon: '/favicon.ico',
  primaryColor: '#0a8ca8',
  sidebarColor: '#0B1A20',
};

const DEFAULT_RESOURCE_KEYS = new Set([
  DEFAULT_SYSTEM_INTERFACE_CONFIG.logo,
  DEFAULT_SYSTEM_INTERFACE_CONFIG.favicon,
  '/images/default-logo.png',
  'default-logo.png',
  'favicon.ico',
]);

@Injectable()
export class SystemInterfaceService implements OnModuleInit {
  constructor(
    @InjectRepository(SystemInterfaceEntity)
    private readonly repository: Repository<SystemInterfaceEntity>,
    private readonly dataSource: DataSource,
    private readonly storage: ResourceStorageService,
  ) {}

  async onModuleInit() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS system_interfaces (
        id varchar(36) NOT NULL,
        logo varchar(255) NOT NULL DEFAULT '${DEFAULT_SYSTEM_INTERFACE_CONFIG.logo}',
        favicon varchar(255) NOT NULL DEFAULT '${DEFAULT_SYSTEM_INTERFACE_CONFIG.favicon}',
        primary_color varchar(20) NOT NULL DEFAULT '${DEFAULT_SYSTEM_INTERFACE_CONFIG.primaryColor}',
        sidebar_color varchar(20) NOT NULL DEFAULT '${DEFAULT_SYSTEM_INTERFACE_CONFIG.sidebarColor}',
        PRIMARY KEY (id)
      )
    `);
  }

  async create(dto: CreateSystemInterfaceDto) {
    this.validateColors(dto);

    const current = await this.findPersistedConfig();

    if (current) {
      return this.update(current.id, dto);
    }

    const config = this.repository.create({
      ...DEFAULT_SYSTEM_INTERFACE_CONFIG,
      ...dto,
    });

    return this.repository.save(config);
  }

  async findOne() {
    const config = await this.findPersistedConfig();

    return {
      id: config?.id || null,
      logo: config?.logo || DEFAULT_SYSTEM_INTERFACE_CONFIG.logo,
      favicon: config?.favicon || DEFAULT_SYSTEM_INTERFACE_CONFIG.favicon,
      primaryColor:
        config?.primaryColor || DEFAULT_SYSTEM_INTERFACE_CONFIG.primaryColor,
      sidebarColor:
        config?.sidebarColor || DEFAULT_SYSTEM_INTERFACE_CONFIG.sidebarColor,
    };
  }

  async update(id: string, dto: UpdateSystemInterfaceDto) {
    this.validateColors(dto);

    const config = await this.repository.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException('Configuracion de interfaz no encontrada.');
    }

    await this.deletePreviousResource(config.logo, dto.logo);
    await this.deletePreviousResource(config.favicon, dto.favicon);

    Object.assign(config, dto);
    return this.repository.save(config);
  }

  async delete(id: string) {
    const config = await this.repository.findOne({ where: { id } });

    if (!config) {
      return this.findOne();
    }

    await this.deleteStoredResource(config.logo);
    await this.deleteStoredResource(config.favicon);
    await this.repository.remove(config);

    return this.findOne();
  }

  private findPersistedConfig() {
    return this.repository.findOne({ order: { id: 'ASC' }, where: {} });
  }

  private async deletePreviousResource(current?: string, next?: string) {
    if (!next || !current || current === next) {
      return;
    }

    await this.deleteStoredResource(current);
  }

  private async deleteStoredResource(key?: string) {
    if (!key || DEFAULT_RESOURCE_KEYS.has(key)) {
      return;
    }

    if (key.startsWith('/') || key.startsWith('http')) {
      return;
    }

    await this.storage.delete(key);
  }

  private validateColors(dto: Partial<CreateSystemInterfaceDto>) {
    const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

    for (const color of [dto.primaryColor, dto.sidebarColor]) {
      if (color && !hexColorRegex.test(color)) {
        throw new BadRequestException('Los colores deben estar en formato hexadecimal.');
      }
    }
  }
}
