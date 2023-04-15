import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { Cacheable } from 'libs/module/redis/redisCache.const';

@Injectable()
export class AppService {
  constructor() {} // private readonly redisClient: Redis, // @InjectRedis()

  @Cacheable(60)
  public getHello(name: string, test?: number): string {
    // this.redisClient.set()
    return 'Hello Trade APP!';
  }
  @Cacheable(60)
  public getHello1({ name: string, test: number }, param: string): string {
    // this.redisClient.set()
    return 'Hello Trade APP!';
  }
}
