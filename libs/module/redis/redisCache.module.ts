import { DynamicModule, Global, Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DiscoveryModule } from '@nestjs/core';
import { CacheDecoratorRegister } from './redistCache.service';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        // url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        url: `redis://localhost:6379`,
      },
    }),
    DiscoveryModule,
  ],
})
@Global()
export class RedisCacheModule {
  static register(options?: Record<string, any>): DynamicModule {
    return {
      module: RedisCacheModule,
      providers: [CacheDecoratorRegister],
      exports: [
        // RedisCacheService
      ],
    };
  }
}
