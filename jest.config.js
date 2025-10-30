module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/Apps"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["Apps/**/*.{ts,js}", "!Apps/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  verbose: true,
};
