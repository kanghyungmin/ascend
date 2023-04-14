import { SetMetadata } from '@nestjs/common';

export const CACHEABLE = Symbol('CACHEABLE');

export const Cacheable = (ttl: number) => SetMetadata(CACHEABLE, ttl);
