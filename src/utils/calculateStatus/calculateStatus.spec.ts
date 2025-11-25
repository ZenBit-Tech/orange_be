import { calculateStatus } from '.';

describe('calculateStatus', () => {
  const MIN = 10;
  const MAX = 100;

  test('Should return "Normal" for values within the range', () => {
    expect(calculateStatus(50, MIN, MAX)).toBe('Normal');
    expect(calculateStatus(10, MIN, MAX)).toBe('Normal');
    expect(calculateStatus(100, MIN, MAX)).toBe('Normal');
  });

  test('Should correctly determine low statuses', () => {
    expect(calculateStatus(6, MIN, MAX)).toBe('Slightly Low');
    expect(calculateStatus(4, MIN, MAX)).toBe('Low');
    expect(calculateStatus(2, MIN, MAX)).toBe('Critical');
  });

  test('Should correctly determine high statuses', () => {
    expect(calculateStatus(140, MIN, MAX)).toBe('Slightly High');
    expect(calculateStatus(180, MIN, MAX)).toBe('High');
    expect(calculateStatus(201, MIN, MAX)).toBe('Critical');
  });
});
