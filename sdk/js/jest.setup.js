// Jest setup file for KILT tests

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

