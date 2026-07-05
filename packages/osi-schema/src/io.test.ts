import { describe, expect, it } from 'vitest';
import { detectFormat, parse, ParseError, serialize } from './io.js';

describe('detectFormat', () => {
  it('prefers a recognizable extension', () => {
    expect(detectFormat('model.json', 'name: x')).toBe('json');
    expect(detectFormat('model.yaml', '{"a":1}')).toBe('yaml');
    expect(detectFormat('model.yml', 'a: 1')).toBe('yaml');
  });

  it('sniffs content when the extension is unknown', () => {
    expect(detectFormat(undefined, '  {"a":1}')).toBe('json');
    expect(detectFormat('model.txt', '[1,2]')).toBe('json');
    expect(detectFormat(undefined, 'name: model')).toBe('yaml');
  });
});

describe('parse', () => {
  it('parses JSON', () => {
    expect(parse('{"a":1}', 'json')).toEqual({ a: 1 });
  });

  it('parses YAML', () => {
    expect(parse('a: 1\nb: two', 'yaml')).toEqual({ a: 1, b: 'two' });
  });

  it('throws ParseError with the format on malformed JSON', () => {
    try {
      parse('{not json', 'json');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).format).toBe('json');
    }
  });

  it('throws ParseError on malformed YAML', () => {
    expect(() => parse('a: [1, 2', 'yaml')).toThrow(ParseError);
  });
});

describe('serialize', () => {
  it('round-trips a value through JSON', () => {
    const value = { version: '0.2.0.dev0', semantic_model: [{ name: 'm', datasets: [] }] };
    expect(parse(serialize(value, 'json'), 'json')).toEqual(value);
  });

  it('round-trips a value through YAML', () => {
    const value = { version: '0.2.0.dev0', semantic_model: [{ name: 'm', datasets: [] }] };
    expect(parse(serialize(value, 'yaml'), 'yaml')).toEqual(value);
  });
});
