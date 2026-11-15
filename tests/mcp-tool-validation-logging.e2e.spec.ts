import { INestApplication } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { bootstrapMcpApp, createEraClient, ERAS, type Era } from './utils';

/**
 * A failed tool-parameter check is an `isError` result for the client
 * (`Invalid parameters: ${issues}`) and a warning on the strategy logger, so a
 * production server can see why the call was rejected. The client payload
 * stays that same string.
 */
@McpController()
class ScheduleTools {
  @Tool({
    name: 'schedule',
    description: 'Schedules something for a date',
    parameters: z.object({
      startDate: z
        .string()
        .refine((value) => !Number.isNaN(Date.parse(value)), {
          message: 'startDate must be a valid date string',
        }),
      limit: z.number().int().positive(),
    }),
  })
  schedule(@Payload() { startDate }: { startDate: string; limit: number }) {
    return { content: [{ type: 'text', text: `Scheduled ${startDate}` }] };
  }
}

const ISSUES =
  '[startDate]: startDate must be a valid date string; [limit]: Too small: expected number to be >0';

describe.each(ERAS)(
  'tool parameter validation logging (%s era)',
  (era: Era) => {
    let app: INestApplication;
    let port: number;
    let warnSpy: jest.SpyInstance;

    beforeAll(async () => {
      const boot = await bootstrapMcpApp({
        controllers: [ScheduleTools],
      });
      app = boot.app;
      port = boot.port;
      // Spy the strategy's own logger — the same Nest logger the handler uses.
      warnSpy = jest
        .spyOn(
          (
            boot.strategy as unknown as {
              logger: { warn: (message: string) => void };
            }
          ).logger,
          'warn',
        )
        .mockImplementation(() => undefined);
    });

    afterAll(async () => {
      warnSpy?.mockRestore();
      await app?.close();
    });

    beforeEach(() => {
      warnSpy.mockClear();
    });

    it('logs the validation issues and leaves the client error unchanged', async () => {
      const client = await createEraClient(era, port);
      try {
        const result = (await client.callTool({
          name: 'schedule',
          arguments: { startDate: 'not-a-date', limit: -1 },
        })) as {
          isError?: boolean;
          content: Array<{ type: string; text: string }>;
        };

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: `Invalid parameters: ${ISSUES}` },
        ]);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          `Tool "schedule" validation failed: ${ISSUES}`,
        );
      } finally {
        await client.close();
      }
    });

    it('does not log a validation warning when the arguments are valid', async () => {
      const client = await createEraClient(era, port);
      try {
        const result = (await client.callTool({
          name: 'schedule',
          arguments: { startDate: '2026-01-15', limit: 2 },
        })) as { isError?: boolean; content: Array<{ text: string }> };

        expect(result.isError).not.toBe(true);
        expect(result.content[0].text).toBe('Scheduled 2026-01-15');
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        await client.close();
      }
    });
  },
);
