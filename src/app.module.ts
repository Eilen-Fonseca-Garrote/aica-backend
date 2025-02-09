import { Module } from '@nestjs/common';
import { PersonalModule } from './modules/personal/personal.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as mysql2 from 'mysql2';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.dev',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        driver: mysql2,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        // entities: [join(__dirname, '**', '*.entity{.js,.ts}')],
        // entities: [Client, Marketer, Contract, Order, Plan],
        synchronize: configService.get<boolean>('SYNCHRO'),
        autoLoadEntities: false,
        extra: { connectionLimit: 10 },
        entities: [],
      }),
      inject: [ConfigService],
    
  }),
    PersonalModule,
  ],
  
})
export class AppModule {}
