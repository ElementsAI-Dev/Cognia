/**
 * Mock for nanoid
 */

let counter = 0;

module.exports = {
  nanoid: () => `mock-id-${++counter}`,
};
