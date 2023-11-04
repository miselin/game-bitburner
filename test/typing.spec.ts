import { ensureString } from '../src/lib/typing';

describe('typing', () => {
  it('should successfully return a string for a string input', () => {
    expect(ensureString('test')).toBe('test');
  });

  it('should return a default value if not a string', () => {
    expect(ensureString(5, 'test')).toBe('test');
  });

  it('should throw if the wrong type is given without a default', () => {
    expect(() => ensureString(5)).toThrow('value 5 was not a string');
  });
});
