import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import 'reflect-metadata';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

@Injectable()
export class CacheDecoratorRegister1 implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @InjectRedis()
    private readonly redisClient: Redis,
  ) {}

  onApplicationBootstrap() {
    console.log('onModuleInit2');
    const ins = this.discoveryService.getProviders(); // #1. 모든 provider 조회
    //   .filter((wrapper) => wrapper.isDependencyTreeStatic())
    //   .filter(({ instance }) => instance && Object.getPrototypeOf(instance));

    // // console.log(ins[0]);
    const methodsnames = ins.forEach((instance) => {
      if (instance.name === 'AppService') {
        console.log(instance.name);
        const res = this.metadataScanner.getAllMethodNames(
          Object.getPrototypeOf(instance),
        );
        console.log(`111111111111=${res}`);
        // console.log(ins);
        // console.log(res);
      }
      // if (res.includes('getHello')) console.log(res);
    });

    // ins.forEach((instance) => {
    //   this.metadataScanner.scanFromPrototype(
    //     instance,
    //     Object.getPrototypeOf(instance),
    //     (methodName) => {
    //       // #2. 메타데이터 value
    //       if (instance.name == 'AppService') console.log(`1-${methodName}`);
    //       // console.log(instance.name);

    //       const methodRef = instance[methodName];

    //       // #3. 기존 함수 데코레이팅
    //       instance[methodName] = async function (...args: any[]) {
    //         const name = `${instance.constructor.name}.${methodName}`;
    //         // const value = await this.redisClient.get(name, args);
    //         // if (value) {
    //         //   return value;
    //         // }

    //         const result = await methodRef.call(instance, ...args);
    //         return result;
    //       };
    //     },
    //   );
    // });
  }
}
