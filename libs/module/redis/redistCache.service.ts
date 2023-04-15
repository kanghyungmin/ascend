import { Injectable, OnModuleInit } from '@nestjs/common';
import 'reflect-metadata';
import { CACHEABLE } from './redisCache.const';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

@Injectable()
export class RedistCacheService implements OnModuleInit {
  // static test = new Redis()
  private name = 'RedistCacheService';
  private methodNameSetKey = 'setTest';
  private methodNameGetKey = 'getTest';

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @InjectRedis()
    private readonly redisClient: Redis,
  ) {}

  onModuleInit() {
    let setKeyFun, getKeyFun, setKyeFunIns;

    this.discoveryService
      .getProviders()
      .filter(({ instance }) => instance && Object.getPrototypeOf(instance))
      .forEach(({ instance }) => {
        const obj = Object.getPrototypeOf(instance);
        if (obj.constructor.name === this.name) {
          setKyeFunIns = instance;
          setKeyFun = instance[this.methodNameSetKey];
          getKeyFun = instance[this.methodNameGetKey];
        }
      });

    // console.log(this.redisClient);
    // console.log(`setKeyFun: ${setKeyFun}`);
    // console.log(`getKeyFun: ${getKeyFun}`);
    // console.log(`setKyeFunIns: ${setKyeFunIns}`);

    return this.discoveryService
      .getProviders()
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter(({ instance }) => instance && Object.getPrototypeOf(instance))
      .forEach(({ instance }) => {
        this.metadataScanner.scanFromPrototype(
          instance,
          Object.getPrototypeOf(instance),
          (methodName) => {
            const reflectorVal = this.reflector.get(
              CACHEABLE,
              instance[methodName],
            );

            if (!reflectorVal) {
              return;
            }
            // console.log(`ttl : ${JSON.stringify(reflectorVal)}`);

            const methodRef = instance[methodName];

            instance[methodName] = async function (...args: any[]) {
              const key = `${instance.constructor.name}.${methodName}`;

              const cacheVal = await getKeyFun.call(setKyeFunIns, key);

              if (cacheVal) {
                // console.log('Cache Hit!');
                return cacheVal;
              }
              const result = await methodRef.call(instance, ...args);
              await setKeyFun.call(setKyeFunIns, key, result, reflectorVal.ttl);

              return result;
            };
          },
        );
      });
  }

  async setTest(key, result, ttl) {
    await this.redisClient.set(key, result, 'EX', ttl);
    console.log(`success`);
  }
  async getTest(key) {
    console.log(`getTest : ${key}`);
    const res = await this.redisClient.get(key);
    console.log(`getTest: ${res}`);
    return res;
  }
}
