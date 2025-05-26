import { DatabaseManager } from '../../src/storage/database';

export const createTestDatabase = (): DatabaseManager => {
  // Use in-memory database for tests
  return new DatabaseManager(':memory:');
};
