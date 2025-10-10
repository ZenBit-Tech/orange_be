/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';

import { RedisService } from '@modules/redis/redis.service';
import { IORedisKey } from '@modules/redis/redis.constants';

describe('RedisService', () => {
  let redisService: RedisService;
  let redisClient: Redis;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: IORedisKey,
          useValue: createMock<Redis>(),
        },
      ],
    }).compile();

    redisService = moduleRef.get<RedisService>(RedisService);
    redisClient = moduleRef.get<Redis>(IORedisKey);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call redisClient.keys with the provided pattern when getKeys is called', async () => {
    const pattern = 'test*';
    const expectedKeys = ['test1', 'test2'];
    (redisClient.keys as jest.Mock).mockResolvedValue(expectedKeys);

    const result = await redisService.getKeys(pattern);

    const keysMock = redisClient.keys;
    expect(keysMock).toHaveBeenCalledWith(pattern);
    expect(result).toEqual(expectedKeys);
  });

  it('should call redisClient.set with the provided key and value when insert is called', async () => {
    const key = 'test-key';
    const value = 'test-value';

    await redisService.insert(key, value);

    const setMock = redisClient.set;
    expect(setMock).toHaveBeenCalledWith(key, value);
  });

  it('should call redisClient.get with the provided key when get is called', async () => {
    const key = 'test-key';
    const expectedValue = 'test-value';
    (redisClient.get as jest.Mock).mockResolvedValue(expectedValue);

    const result = await redisService.get(key);

    const getMock = redisClient.get;
    expect(getMock).toHaveBeenCalledWith(key);
    expect(result).toEqual(expectedValue);
  });

  it('should call redisClient.del with the provided key when delete is called', async () => {
    const key = 'test-key';

    await redisService.delete(key);

    const delMock = redisClient.del;
    expect(delMock).toHaveBeenCalledWith(key);
  });

  it('should return true if the stored value matches the provided value when validate is called', async () => {
    const key = 'test-key';
    const value = 'test-value';
    (redisClient.get as jest.Mock).mockResolvedValue(value);

    const result = await redisService.validate(key, value);

    const getMock = redisClient.get;
    expect(getMock).toHaveBeenCalledWith(key);
    expect(result).toBe(true);
  });

  it('should return false if the stored value does not match the provided value when validate is called', async () => {
    const key = 'test-key';
    const value = 'test-value';
    (redisClient.get as jest.Mock).mockResolvedValue('other-value');

    const result = await redisService.validate(key, value);

    const getMock = redisClient.get;
    expect(getMock).toHaveBeenCalledWith(key);
    expect(result).toBe(false);
  });
});
