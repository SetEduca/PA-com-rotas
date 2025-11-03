// jest.setup.js
// Configuração global para silenciar logs durante os testes

// Silenciar console.log
global.console.log = jest.fn();

// Silenciar console.error
global.console.error = jest.fn();

// Silenciar console.warn
global.console.warn = jest.fn();

// Opcional: Se quiser ver apenas erros críticos, descomente:
// global.console.error = (...args) => {
//     if (args[0]?.includes('CRÍTICO')) {
//         console.error(...args);
//     }
// };