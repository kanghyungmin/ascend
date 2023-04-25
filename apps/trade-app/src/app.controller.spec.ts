import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DBconnectionMoudle } from 'libs/module/db/connection.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DBconnectionService } from 'libs/module/db/connection.service';
import { Trade, TradeSchema } from 'libs/model/trade.entity';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigModule } from 'libs/module/config/config.module';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.register({ envPath: 'envs/trade/.env' }),
        // RedisCacheModule.register(),
        DBconnectionMoudle,
        MongooseModule.forRootAsync({
          connectionName: process.env.REPL_MONGO_DB,
          inject: [DBconnectionService],
          useFactory: async (dbSvc: DBconnectionService) =>
            dbSvc.getMongoConfig(),
        }),
        MongooseModule.forFeature(
          [{ name: Trade.name, schema: TradeSchema }],
          process.env.REPL_ADMIN_MONGO_DB,
        ),
        DiscoveryModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
