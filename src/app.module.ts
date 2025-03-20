import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as mysql2 from 'mysql2';
import * as pgDB from 'pg';
import { envSchema } from './config/env.schema';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: '.env.dev',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        driver: pgDB,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        synchronize: configService.get<boolean>('SYNCHRO'),
        autoLoadEntities: false,
        extra: { connectionLimit: 10 },
        entities: [],
      }),
      inject: [ConfigService],
      
  }),
    ExportModule,
  ],
  
})
export class AppModule {}
