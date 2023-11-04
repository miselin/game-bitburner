module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test/'],
  transform: {
    '^.+\\.tsx?$': 'esbuild-jest',
  },
};
