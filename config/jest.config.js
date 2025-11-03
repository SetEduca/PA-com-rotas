// jest.config.js
export default {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    verbose: false,
    silent: true, // IMPORTANTE: Silencia todos os logs
    transform: {},
    testMatch: ['**/test/**/*.test.js'],
    collectCoverageFrom: [
        'routes/**/*.js',
        '!routes/**/*.test.js'
    ]
};