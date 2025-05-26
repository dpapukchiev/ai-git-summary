import fs from 'fs';
import path from 'path';

// Mock chalk to avoid ES module issues in tests
jest.mock('chalk', () => ({
  default: {
    green: (text: string) => text,
    red: (text: string) => text,
    yellow: (text: string) => text,
    blue: (text: string) => text,
    cyan: (text: string) => text,
    magenta: (text: string) => text,
    white: (text: string) => text,
    gray: (text: string) => text,
    bold: (text: string) => text,
    dim: (text: string) => text,
  },
  green: (text: string) => text,
  red: (text: string) => text,
  yellow: (text: string) => text,
  blue: (text: string) => text,
  cyan: (text: string) => text,
  magenta: (text: string) => text,
  white: (text: string) => text,
  gray: (text: string) => text,
  bold: (text: string) => text,
  dim: (text: string) => text,
}));

// Mock p-queue to avoid ES module issues
jest.mock('p-queue', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockImplementation(fn => Promise.resolve(fn())),
      onIdle: jest.fn().mockResolvedValue(undefined),
      size: 0,
      pending: 0,
    })),
  };
});

// Global test setup - clean up test databases
beforeEach(() => {
  const testDbPath = path.join(__dirname, 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

afterAll(() => {
  const testDbPath = path.join(__dirname, 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});
