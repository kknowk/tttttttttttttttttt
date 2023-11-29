import { Test, TestingModule } from '@nestjs/testing';
import { ApiHomeController } from './api-home.controller.js';

describe('HomeController', () => {
  let controller: ApiHomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiHomeController],
    }).compile();

    controller = module.get<ApiHomeController>(ApiHomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
