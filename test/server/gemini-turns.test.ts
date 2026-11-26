// Tests for the adapter's message shapes: the marked data turn, schema slimming, tool turns and reply reading.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineTool } from '../../src/lib/model.js';
import {
  callsIn,
  dataTurn,
  jsonSchemaFor,
  readReply,
  replyText,
  runToolCall,
  systemText,
  toolTurn,
} from '../../src/server/gemini-turns.js';

describe('systemText and dataTurn', () => {
  it('put the marker rules before the task and wrap facts and data in marked blocks', () => {
    expect(systemText('Task.', 'abc')).toMatch(/marker abc\.[\s\S]*Task\.$/);
    const turn = dataTurn(
      {
        task: 'ask',
        instructions: 'i',
        data: 'hello',
        facts: [{ id: 'f', label: 'F', value: 1, unit: '' }],
        schema: z.string(),
        tools: [],
      },
      'abc',
    );
    expect(turn).toEqual({
      role: 'user',
      parts: [
        {
          text: 'FACTS abc\n[{"id":"f","label":"F","value":1,"unit":""}]\nEND FACTS abc\nDATA abc\nhello\nEND DATA abc',
        },
      ],
    });
  });
});

describe('jsonSchemaFor', () => {
  it('keeps types, enums, structure and nullable unions, and drops bounds, patterns and the dialect', () => {
    const schema = z.strictObject({
      pattern: z.string().regex(/^a/).max(5),
      kind: z.literal('x'),
      list: z
        .array(z.enum(['a', 'b']))
        .min(1)
        .max(3),
      size: z.number().positive().max(9).nullable(),
    });
    expect(jsonSchemaFor(schema)).toEqual({
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        kind: { type: 'string', enum: ['x'] },
        list: { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
        size: { anyOf: [{ type: 'number' }, { type: 'null' }] },
      },
      required: ['pattern', 'kind', 'list', 'size'],
    });
  });
});

describe('runToolCall and toolTurn', () => {
  const tool = defineTool({
    name: 'calc',
    description: 'x',
    parameters: z.strictObject({ n: z.number() }),
    run: ({ n }) => n * 2,
  });

  it('runs a declared tool, refuses others, and names an unnamed call', () => {
    expect(runToolCall([tool], { name: 'calc', args: { n: 2 } })).toEqual({
      name: 'calc',
      args: { n: 2 },
      result: 4,
      failure: null,
    });
    expect(runToolCall([tool], { name: 'calc', args: { n: 'two' } })).toMatchObject({
      failure: 'invalid_arguments',
    });
    expect(runToolCall([tool], { name: 'x'.repeat(80) })).toMatchObject({
      name: 'x'.repeat(64),
      failure: 'unknown_tool',
    });
    expect(runToolCall([tool], {})).toMatchObject({ name: 'unnamed', args: {}, failure: 'unknown_tool' });
  });

  it('hands back results and errors, with the call id only when the model gave one', () => {
    const records = [
      runToolCall([tool], { name: 'calc', args: { n: 1 } }),
      runToolCall([tool], { name: 'nope' }),
    ];
    const turn = toolTurn([{ id: 'c1', name: 'calc' }, { name: 'nope' }], records);
    expect(JSON.parse(JSON.stringify(turn))).toEqual({
      role: 'user',
      parts: [
        { functionResponse: { id: 'c1', name: 'calc', response: { output: 2 } } },
        { functionResponse: { name: 'nope', response: { error: 'unknown_tool' } } },
      ],
    });
  });
});

describe('callsIn, replyText and readReply', () => {
  it('read calls and text from a model turn, and parse only JSON that fits the schema', () => {
    expect(callsIn({ role: 'model' })).toEqual([]);
    expect(callsIn({ parts: [{ functionCall: { name: 'a' } }, { text: 'x' }] })).toEqual([{ name: 'a' }]);
    expect(replyText({})).toBe('');
    expect(replyText({ parts: [{ text: 'a', thought: true }, { text: '{"t":' }, { text: '1}' }, {}] })).toBe(
      '{"t":1}',
    );
    const schema = z.strictObject({ t: z.number() });
    expect(readReply(schema, '{"t":1}')).toEqual({ value: { t: 1 } });
    expect(readReply(schema, '{"t":"1"}')).toBeNull();
    expect(readReply(schema, 'not json')).toBeNull();
  });
});
