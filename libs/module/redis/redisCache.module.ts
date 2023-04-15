import { DynamicModule, Global, Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DiscoveryModule } from '@nestjs/core';
import { RedistCacheService } from './redistCache.service';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: () => ({
        config: {
          url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        },
      }),
      inject: [ConfigService],
      imports: [ConfigModule.register({ envPath: 'envs/trade/.env' })],
    }),
    DiscoveryModule,
  ],
})
@Global()
export class RedisCacheModule {
  static register(options?: Record<string, any>): DynamicModule {
    return {
      module: RedisCacheModule,
      providers: [RedistCacheService],
      exports: [
        // RedisCacheService
      ],
    };
  }
}
