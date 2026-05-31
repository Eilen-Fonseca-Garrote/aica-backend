import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { extname } from 'path';
import { Readable } from 'stream';

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

const CONTENT_TYPES: Record<string, string> = {
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export interface UploadedResourceFile {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
}

export interface StoredResource {
  key: string;
}

export interface DownloadedResource {
  key: string;
  contentType: string;
  stream: Readable;
}

interface MinioConnectionConfig {
  accessKey: string;
  bucket: string;
  endpoint: string;
  port: number;
  secretKey: string;
  useSSL: boolean;
}

@Injectable()
export class ResourceStorageService implements OnModuleInit {
  private readonly logger = new Logger(ResourceStorageService.name);
  private client: Client | null = null;
  private initializing: Promise<Client> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.ensureClientAndBucket();
    } catch (error) {
      this.logger.warn('MinIO no disponible al iniciar. Se reintentara bajo demanda.');
      this.logger.warn((error as Error)?.message || 'Error desconocido de MinIO.');
    }
  }

  async upload(name: string, file: UploadedResourceFile): Promise<StoredResource> {
    if (!file) {
      throw new BadRequestException('Debe enviar un archivo.');
    }

    const key = this.normalizeKey(name);
    const extension = extname(key).toLowerCase();

    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Formato de imagen no soportado.');
    }

    const client = await this.getClient();
    const objectName = this.resolveObjectName(key);
    const bucket = this.getBucket();

    await client.putObject(
      bucket,
      objectName,
      file.buffer,
      file.size || file.buffer.length,
    );

    return { key };
  }

  async download(name: string): Promise<DownloadedResource> {
    const key = this.normalizeKey(name);
    const client = await this.getClient();
    const bucket = this.getBucket();

    for (const objectName of this.resolveObjectCandidates(key)) {
      try {
        const stream = await client.getObject(bucket, objectName);

        return {
          key,
          contentType:
            CONTENT_TYPES[extname(key).toLowerCase()] ||
            'application/octet-stream',
          stream,
        };
      } catch (error: any) {
        const code = error?.code;

        if (code === 'NoSuchKey' || code === 'NotFound') {
          continue;
        }

        throw error;
      }
    }

    throw new NotFoundException('Recurso no encontrado.');
  }

  async delete(name: string) {
    const key = this.normalizeKey(name);
    const client = await this.getClient();
    const bucket = this.getBucket();

    for (const objectName of this.resolveObjectCandidates(key)) {
      try {
        await client.removeObject(bucket, objectName);
        return;
      } catch (error: any) {
        const code = error?.code;

        if (code === 'NoSuchKey' || code === 'NotFound') {
          continue;
        }

        throw error;
      }
    }
  }

  private async getClient() {
    try {
      return await this.ensureClientAndBucket();
    } catch (error) {
      this.logger.error('No se pudo conectar con MinIO.', error as Error);

      throw new ServiceUnavailableException(
        'No se pudo conectar con MinIO. Revise MINIO_URL, MINIO_PORT y el estado del servicio.',
      );
    }
  }

  private async ensureClientAndBucket() {
    if (this.client) {
      return this.client;
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.createClientAndEnsureBucket();

    try {
      this.client = await this.initializing;
      return this.client;
    } finally {
      this.initializing = null;
    }
  }

  private async createClientAndEnsureBucket() {
    const config = this.readConnectionConfig();

    const client = new Client({
      accessKey: config.accessKey,
      endPoint: config.endpoint,
      port: config.port,
      secretKey: config.secretKey,
      useSSL: config.useSSL,
    });

    const exists = await client.bucketExists(config.bucket);

    if (!exists) {
      await client.makeBucket(config.bucket, 'us-east-1');
      this.logger.log(`Bucket creado: ${config.bucket}`);
    }

    return client;
  }

  private readConnectionConfig(): MinioConnectionConfig {
    const rawUrl = this.configService.get<string>('MINIO_URL') || '';
    const rawPort = this.configService.get<number>('MINIO_PORT');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || '';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || '';
    const bucket = this.getBucket();
    const envUseSSL = this.configService.get<boolean>('MINIO_USE_SSL') || false;

    if (!rawUrl || !accessKey || !secretKey) {
      throw new Error('Configuracion MinIO incompleta.');
    }

    let endpoint = rawUrl;
    let port = rawPort || 9000;
    let useSSL = envUseSSL;

    if (rawUrl.includes('://')) {
      const parsed = new URL(rawUrl);
      endpoint = parsed.hostname;
      useSSL = parsed.protocol === 'https:';

      if (parsed.port) {
        const parsedPort = Number(parsed.port);

        if (Number.isFinite(parsedPort)) {
          port = parsedPort;
        }
      }
    }

    if (!endpoint) {
      throw new Error('MINIO_URL invalida.');
    }

    return {
      accessKey,
      bucket,
      endpoint,
      port,
      secretKey,
      useSSL,
    };
  }

  private getBucket() {
    return this.configService.get<string>('MINIO_BUCKET') || 'personal-resources';
  }

  private normalizeKey(name: string) {
    const decoded = decodeURIComponent(name || '');
    const value = decoded.split('/').pop()?.trim() || '';
    const key = value.replace(/[^a-zA-Z0-9._-]/g, '-');

    if (!key || key === '.' || key === '..') {
      throw new BadRequestException('Nombre de recurso invalido.');
    }

    return key;
  }

  private resolveObjectName(key: string) {
    return `images/${key}`;
  }

  private resolveObjectCandidates(key: string) {
    return Array.from(new Set([this.resolveObjectName(key), key]));
  }
}