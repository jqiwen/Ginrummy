import { decimalToDozenal, formatDozenal } from '../game/rules';

describe('Base-12 score display', () => {
  it.each([
    [10, '↊'],
    [11, '↋'],
    [12, '10'],
    [13, '11'],
    [19, '17'],
    [36, '30'],
    [45, '39'],
  ])('converts decimal %i to %s', (decimal, dozenal) => {
    expect(decimalToDozenal(decimal)).toBe(dozenal);
  });

  it('adds a clear base indicator for presentation', () => {
    expect(formatDozenal(36)).toBe('30₁₂');
  });
});
