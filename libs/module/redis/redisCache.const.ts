import { SetMetadata } from '@nestjs/common';

export const CACHEABLE = Symbol('CACHEABLE');

export const Cacheable = (ttl: number, key?, value?, account?) =>
  SetMetadata(CACHEABLE, {
    ttl,
    key,
    value,
    account,
  });
