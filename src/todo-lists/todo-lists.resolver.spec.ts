import { Test, TestingModule } from '@nestjs/testing';
import { TodoListsResolver } from './todo-lists.resolver';

describe('TodoListsResolver', () => {
  let resolver: TodoListsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodoListsResolver],
    }).compile();

    resolver = module.get<TodoListsResolver>(TodoListsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
