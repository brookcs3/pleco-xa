module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/index.test.js',
    // '/examples/demos/',
    // '/examples/astro-demo/',
    // '/examples/astro-doppler/',
    // '/examples/astro-site/',
    // '/examples/frontend/',
    // '/examples/backend/'
  ]
};