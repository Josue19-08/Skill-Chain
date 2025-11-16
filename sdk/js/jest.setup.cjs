// Jest setup file for KILT tests

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Add TextEncoder and TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Increase timeout for network operations
jest.setTimeout(30000);

// Force exit after tests to prevent hanging
if (typeof process !== 'undefined') {
  // Give Jest time to cleanup, then force exit
  const originalExit = process.exit;
  process.exit = function(code) {
    setTimeout(() => {
      originalExit(code);
    }, 1000);
  };
}

