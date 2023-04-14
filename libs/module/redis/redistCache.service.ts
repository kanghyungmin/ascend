import { Injectable, OnModuleInit } from '@nestjs/common';
import 'reflect-metadata';
import { CACHEABLE } from './redisCache.const';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

@Injectable()
export class CacheDecoratorRegister implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @InjectRedis()
    private readonly redisClient: Redis,
  ) {}

  // onModuleInit() {
  //   console.log('onModuleInit');
  //   this.redisClient.set('11', 2);
  //   const ins = this.discoveryService
  //     .getProviders() // #1. 모든 provider 조회
  //     .filter((wrapper) => wrapper.isDependencyTreeStatic())
  //     .filter(({ instance }) => instance && Object.getPrototypeOf(instance))
  //     .forEach(
  //       ({ instance }) => {
  //         this.metadataScanner.scanFromPrototype(
  //           instance,
  //           Object.getPrototypeOf(instance),
  //           (methodName) => {
  //             // #2. 메타데이터 value
  //             if (instance.name == 'AppService') console.log(methodName);
  //             const ttl = this.reflector.get(CACHEABLE, instance[methodName]);

  //             if (!ttl) {
  //               return;
  //             } else {
  //               console.log('ttl 있다. ');
  //             }

  //             const methodRef = instance[methodName];
  //             console.log('--------------------------------');
  //             console.log(`${instance}${methodName}`);
  //             console.log('--------------------------------');
  //             // #3. 기존 함수 데코레이팅
  //             instance[methodName] = async function (...args: any[]) {
  //               const name = `${instance.constructor.name}.${methodName}`;
  //               console.log(`this=${JSON.stringify(this)}`);
  //               console.log(`this=${JSON.stringify(this.redisClient)}`);
  //               const value = await this.redisClient.get(name, args);
  //               if (value) {
  //                 return value;
  //               }

  //               const result = await methodRef.call(instance, ...args);
  //               await this.redisClient.set(name, args, result, ttl);
  //               return result;
  //             };
  //           },
  //         );
  //       },
  //       { aa: this, bb: '1' },
  //     );
  //   return ins;
  // }
  onModuleInit() {
    console.log('onModuleInit');

    const ins = this.discoveryService
      .getProviders()
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter(({ instance }) => instance && Object.getPrototypeOf(instance));

    ins.forEach(({ instance }) => {
      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName) => {
          if (instance.name == 'AppService') console.log(methodName);
          const ttl = this.reflector.get(CACHEABLE, instance[methodName]);

          if (!ttl) {
            return;
          } else {
            console.log('ttl 있다. ');
          }

          const methodRef = instance[methodName];
          console.log('--------------------------------');
          console.log(`${instance}${methodName}`);
          console.log('--------------------------------');

          instance[methodName] = async function (...args: any[]) {
            const name = `${instance.constructor.name}.${methodName}`;
            console.log(`this=${JSON.stringify(this)}`);
            console.log(`this=${JSON.stringify(this.redisClient)}`);
            const value = await this.redisClient.get(name, args);
            if (value) {
              return value;
            }

            const result = await methodRef.call(instance, ...args);
            await this.redisClient.set(name, args, result, ttl);
            return result;
          };
        },
      );
    }, this);
    return ins;
  }
}
