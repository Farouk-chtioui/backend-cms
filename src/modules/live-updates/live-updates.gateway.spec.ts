import { Test, TestingModule } from '@nestjs/testing';
import { LiveUpdatesGateway } from './live-updates.gateway';

describe('LiveUpdatesGateway', () => {
  let gateway: LiveUpdatesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveUpdatesGateway],
    }).compile();

    gateway = module.get<LiveUpdatesGateway>(LiveUpdatesGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
