import { Injectable } from '@nestjs/common';
import { Cacheable } from 'libs/module/redis/redisCache.const';

@Injectable()
export class AppService {
  @Cacheable(60)
  public getHello(): string {
    return 'Hello Trade APP!';
  }
}
