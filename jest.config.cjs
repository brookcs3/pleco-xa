module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
    "^.+\\.ts$": "ts-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!dependency1|dependency2|dependency3)/"
  ]
};