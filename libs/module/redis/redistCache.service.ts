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
  private methodNameGetKey = 'getKeysWithBounce';
  private distributedKeySZ = 3;
  private perCheckTime = 2000; //ms 단위
  private deBounceIterations = 3;
  private deBounceIntervalTime = 500; //ms 단위
  private mutexArr: Map<string, boolean> = new Map();

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

            const methodRef = instance[methodName];
            const getKeyFN = (...args: any[]) => {
              let key = '';
              for (let i = 0; i < args[0].length; i++) {
                if (typeof args[0][i] === 'object') {
                  key += JSON.stringify(args[0][i]);
                } else {
                  key += args[0][i].toString();
                }
              }
              return `${instance.constructor.name}.${methodName}_${key}`;
            };

            instance[methodName] = async function (...args: any[]) {
              const redisKey = getKeyFN(args);

              //Debounce / Per / Distributed Keys 적용
              const cacheVal = await getKeyFun.call(
                setKyeFunIns,
                { method: methodRef, instance, args },
                setKyeFunIns,
                setKeyFun,
                redisKey,
                reflectorVal,
              );

              return cacheVal;
            };
          },
        );
      });
  }

  async setTest(key, result, ttl) {
    await this.redisClient.set(key, result, 'EX', ttl);
    console.log(`success${key}, ${ttl}`);
  }

  getTTLs(ttl: number) {
    let retArr: number[] = [];
    for (let i = 0; i < this.distributedKeySZ; i++) {
      retArr.push(ttl * (i + 1));
    }
    return retArr;
  }
  async getKeysWithBounce(
    decoratedinfo,
    instance,
    setFun,
    keyPrefix,
    reflectorInfo,
  ) {
    const redisKeys: string[] = this.getKeysWithPrefix(keyPrefix);
    const ttls: number[] = this.getTTLs(reflectorInfo.ttl);

    let [cacheValue, idx] = await this.getValueWithRV(redisKeys);

    if (cacheValue && idx == 0) {
      //0번째인 경우 PER 돌림.
      // return cacheValue;
      await this.applyPERlogic(keyPrefix, redisKeys, ttls, decoratedinfo);
    } else if (!cacheValue && idx < this.distributedKeySZ - 1) {
      //check distributed keys & update keys

      const lastValue = await this.redisClient.get(
        redisKeys[this.distributedKeySZ - 1],
      );
      if (lastValue) {
        cacheValue = lastValue;
      } else {
        cacheValue = await this.setKeysWithBounce(
          keyPrefix,
          redisKeys,
          ttls,
          decoratedinfo,
        );
      }
    } else if (!cacheValue && idx == this.distributedKeySZ - 1) {
      cacheValue = await this.setKeysWithBounce(
        keyPrefix,
        redisKeys,
        ttls,
        decoratedinfo,
      );
    }
    try {
      if (typeof cacheValue === 'string') {
        cacheValue = JSON.parse(cacheValue);
      }
    } catch {
      console.log('JSON Parse error');
    }

    return cacheValue;
  }

  //debounce / per / withMultiKeys 적용
  async applyPERlogic(
    keyPrefix: string,
    redisKeys: string[],
    setTTLs: number[],
    decoratedInfo: { method: any; instance: any; args: any[] },
  ) {
    const renew = async () => {
      const leftedTTlms = await this.redisClient.pttl(redisKeys[0]);
      const rv = this.getRVfromUniDis(0, 1);

      if (leftedTTlms - rv * this.perCheckTime >= 0) return false;
      else return true;
    };

    const isNew = await renew();

    if (isNew) {
      //업데이트
      await this.setKeysWithBounce(
        keyPrefix,
        redisKeys,
        setTTLs,
        decoratedInfo,
      );
    }
  }

  async setKeysWithBounce(
    keyPrefix: string,
    redisKeys: string[],
    setTTLs: number[],
    decoratedInfo: { method: any; instance: any; args: any[] },
  ) {
    let result = null;
    const mapValue = this.mutexArr.get(keyPrefix);
    if (!mapValue) {
      this.mutexArr.set(keyPrefix, true);
      result = await decoratedInfo.method.call(
        decoratedInfo.instance,
        ...decoratedInfo.args,
      );

      for (let i = 0; i < redisKeys.length; i++) {
        await this.redisClient.set(
          redisKeys[i],
          JSON.stringify(result),
          'EX',
          setTTLs[i],
        );
      }
      this.mutexArr.set(keyPrefix, false);
    }

    //debounce logic
    if (!result) {
      result = await this.waitUntilValueReturn(
        redisKeys,
        this.deBounceIterations,
      );
    }
    return result;
  }
  async waitUntilValueReturn(redisKeys: string[], ntime: number) {
    return new Promise((resolve, reject) => {
      const checkFn = setInterval(async () => {
        const cacheValue = await this.redisClient.get(redisKeys[0]);
        ntime -= 1;
        if (cacheValue || ntime === 0) {
          // console.log(`${idx}  cacheValue : ${cacheValue.length}`);
          clearInterval(checkFn);
          // console.log(`${idx} cachehit 성공`);

          resolve(cacheValue);
        }
      }, this.deBounceIntervalTime);
    });
  }
  async getValueWithRV(redisKeys: string[]): Promise<[string, number]> {
    const idx = this.getRandomInt();
    return [await this.redisClient.get(redisKeys[idx]), idx];
  }
  getRandomInt() {
    return Math.floor(Math.random() * this.distributedKeySZ);
  }
  getKeysWithPrefix(prefix: string) {
    let retArr: string[] = [];
    for (let i = 0; i < this.distributedKeySZ; i++) {
      retArr.push(`${prefix}-${i}`);
    }
    return retArr;
  }
  getRVfromUniDis(min, max) {
    return Math.random() * (max - min) + min;
  }
}
