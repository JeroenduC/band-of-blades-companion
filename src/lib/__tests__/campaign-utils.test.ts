import { describe, it, expect } from 'vitest';
import { ticksFromDice, applyTimeClockTicks } from '../campaign-utils';

describe('ticksFromDice', () => {
  it('returns 1 for worst die 1-3', () => {
    expect(ticksFromDice([1])).toBe(1);
    expect(ticksFromDice([3])).toBe(1);
    expect(ticksFromDice([3, 5, 6])).toBe(1);
  });

  it('returns 2 for worst die 4-5', () => {
    expect(ticksFromDice([4])).toBe(2);
    expect(ticksFromDice([5])).toBe(2);
    expect(ticksFromDice([4, 6])).toBe(2);
  });

  it('returns 3 for worst die 6 (single 6)', () => {
    expect(ticksFromDice([6])).toBe(3);
  });

  it('returns 5 for critical (two or more 6s)', () => {
    expect(ticksFromDice([6, 6])).toBe(5);
    expect(ticksFromDice([6, 6, 6])).toBe(5);
  });
});

describe('applyTimeClockTicks', () => {
  it('fills clock1 first', () => {
    const result = applyTimeClockTicks(0, 0, 0, 3);
    expect(result).toEqual({
      clock1: 3,
      clock2: 0,
      clock3: 0,
      brokenAdvance: false
    });
  });

  it('fills clock2 when clock1 is full', () => {
    const result = applyTimeClockTicks(10, 0, 0, 3);
    expect(result).toEqual({
      clock1: 10,
      clock2: 3,
      clock3: 0,
      brokenAdvance: false
    });
  });

  it('overflows from clock1 to clock2', () => {
    const result = applyTimeClockTicks(8, 0, 0, 5);
    expect(result).toEqual({
      clock1: 10,
      clock2: 3,
      clock3: 0,
      brokenAdvance: true
    });
  });

  it('sets brokenAdvance to true when any clock fills', () => {
    expect(applyTimeClockTicks(9, 0, 0, 1).brokenAdvance).toBe(true);
    expect(applyTimeClockTicks(10, 9, 0, 1).brokenAdvance).toBe(true);
    expect(applyTimeClockTicks(10, 10, 9, 1).brokenAdvance).toBe(true);
  });

  it('handles large tick counts without crashing', () => {
    const result = applyTimeClockTicks(0, 0, 0, 50);
    expect(result).toEqual({
      clock1: 10,
      clock2: 10,
      clock3: 10,
      brokenAdvance: true
    });
  });

  it('does nothing if all clocks are full', () => {
    const result = applyTimeClockTicks(10, 10, 10, 5);
    expect(result).toEqual({
      clock1: 10,
      clock2: 10,
      clock3: 10,
      brokenAdvance: false
    });
  });

  it('is robust when starting with non-zero values', () => {
    const result = applyTimeClockTicks(5, 5, 0, 10);
    // clock1 gets 5 -> 10. remaining 5.
    // clock2 gets 5 -> 10. remaining 0.
    expect(result).toEqual({
      clock1: 10,
      clock2: 10,
      clock3: 0,
      brokenAdvance: true
    });
  });
});
