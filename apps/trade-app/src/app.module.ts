import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from 'libs/module/config/config.module';
import { DBconnectionMoudle } from 'libs/module/db/connection.module';
import { DBconnectionService } from 'libs/module/db/connection.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Trade, TradeSchema } from 'libs/model/trade.entity';
import { RedisCacheModule } from 'libs/module/redis/redisCache.module';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { CacheDecoratorRegister1 } from './test.service';

@Module({
  imports: [
    RedisCacheModule.register(),
    ConfigModule.register({ envPath: 'envs/trade/.env' }),
    DBconnectionMoudle,
    MongooseModule.forRootAsync({
      connectionName: process.env.REPL_MONGO_DB,
      inject: [DBconnectionService],
      useFactory: async (dbSvc: DBconnectionService) => dbSvc.getMongoConfig(),
    }),
    MongooseModule.forFeature(
      [{ name: Trade.name, schema: TradeSchema }],
      process.env.REPL_ADMIN_MONGO_DB,
    ),
    DiscoveryModule,
  ],
  controllers: [AppController],
  providers: [AppService, CacheDecoratorRegister1],
})
export class AppModule {}
