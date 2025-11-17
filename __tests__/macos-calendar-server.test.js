/**
 * Unit tests for macOS Calendar MCP Server
 *
 * Note: These tests use mocked AppleScript execution.
 * For integration tests with actual Calendar app, see __tests__/integration/.
 */

import { jest } from '@jest/globals';
import { MacOSCalendarServer } from '../macos-calendar-mcp-sdk.js';

// Mock execSync to avoid requiring actual Calendar app
const mockExecSync = jest.fn();
jest.mock('child_process', () => ({
  execSync: (...args) => mockExecSync(...args),
}));

describe('MacOSCalendarServer', () => {
  let server;

  beforeEach(() => {
    // Set language to English for consistent test results
    process.env.LANGUAGE = 'en';
    server = new MacOSCalendarServer();
    mockExecSync.mockClear();
  });

  describe('formatDateForAppleScript', () => {
    it('should format valid date correctly', () => {
      const result = server.formatDateForAppleScript('2025-01-15 14:30');
      expect(result).toEqual({
        year: 2025,
        month: 1,
        day: 15,
        hour: 14,
        minute: 30,
      });
    });

    it('should throw error for invalid date format', () => {
      expect(() => {
        server.formatDateForAppleScript('invalid-date');
      }).toThrow(/Invalid date format/);
    });

    it('should throw error for missing time', () => {
      expect(() => {
        server.formatDateForAppleScript('2025-01-15');
      }).toThrow(/Invalid date format/);
    });
  });

  describe('listCalendars', () => {
    it('should return list of calendars', async () => {
      mockExecSync.mockReturnValue('Personal, Work, Family');

      const result = await server.listCalendars();

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.calendars).toContain('Personal');
      expect(resultText.calendars).toContain('Work');
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('tell application "Calendar"'),
        { encoding: 'utf8' }
      );
    });

    it('should handle permission errors', async () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error('not allowed to assist');
        error.message = 'not allowed to assist';
        throw error;
      });

      await expect(server.listCalendars()).rejects.toThrow(/Permission error|Calendar app permissions/i);
    });
  });

  describe('createEvent', () => {
    it('should validate required parameters', async () => {
      await expect(server.createEvent({})).rejects.toThrow(/Missing required parameter/i);
    });

    it('should validate date format', async () => {
      await expect(
        server.createEvent({
          title: 'Test Event',
          startDate: 'invalid',
          endDate: '2025-01-15 15:00',
        })
      ).rejects.toThrow(/Date format error/i);
    });

    it('should create event successfully', async () => {
      mockExecSync.mockReturnValue('');

      const result = await server.createEvent({
        title: 'Test Event',
        startDate: '2025-01-15 14:00',
        endDate: '2025-01-15 15:00',
        calendar: 'Personal',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.success).toBe(true);
      expect(resultText.event.title).toBe('Test Event');
    });
  });

  describe('createBatchEvents', () => {
    it('should validate events array is required', async () => {
      await expect(server.createBatchEvents({})).rejects.toThrow(/Missing required parameter.*events/i);
    });

    it('should validate events array is not empty', async () => {
      await expect(server.createBatchEvents({ events: [] })).rejects.toThrow(/Events array is empty/i);
    });

    it('should create multiple events successfully', async () => {
      mockExecSync.mockReturnValue('');

      const result = await server.createBatchEvents({
        events: [
          { title: 'Event 1', startDate: '2025-01-15 10:00', endDate: '2025-01-15 11:00' },
          { title: 'Event 2', startDate: '2025-01-15 14:00', endDate: '2025-01-15 15:00' },
        ],
        calendar: 'Work',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.successCount).toBe(2);
      expect(result.content[0].text).toContain('Event 1');
      expect(result.content[0].text).toContain('Event 2');
    });

    it('should handle partial failures', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('Event 1')) {
          return '';
        } else {
          throw new Error('Calendar error');
        }
      });

      const result = await server.createBatchEvents({
        events: [
          { title: 'Event 1', startDate: '2025-01-15 10:00', endDate: '2025-01-15 11:00' },
          { title: 'Event 2', startDate: '2025-01-15 14:00', endDate: '2025-01-15 15:00' },
        ],
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.successCount).toBe(1);
      expect(resultText.failCount).toBe(1);
    });

    it('should validate individual event parameters', async () => {
      const result = await server.createBatchEvents({
        events: [
          { title: 'Valid Event', startDate: '2025-01-15 10:00', endDate: '2025-01-15 11:00' },
          { startDate: '2025-01-15 14:00', endDate: '2025-01-15 15:00' }, // Missing title
        ],
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.results.some(r => !r.success)).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter');
    });
  });

  describe('deleteEventsByKeyword', () => {
    it('should require confirmation', async () => {
      const result = await server.deleteEventsByKeyword({
        keyword: 'test',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.requiresConfirmation).toBe(true);
      expect(result.content[0].text).toContain('confirm');
    });

    it('should delete events with confirmation', async () => {
      mockExecSync.mockReturnValue('5');

      const result = await server.deleteEventsByKeyword({
        keyword: 'test',
        confirm: true,
        calendar: 'Work',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.deletedCount).toBe(5);
    });

    it('should handle calendar not found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error(`Calendar doesn't understand the "calendar" message`);
      });

      await expect(
        server.deleteEventsByKeyword({
          keyword: 'test',
          confirm: true,
          calendar: 'NonExistent',
        })
      ).rejects.toThrow(/Calendar.*not found/i);
    });
  });

  describe('listTodayEvents', () => {
    it('should return today events', async () => {
      mockExecSync.mockReturnValue('Event 1|2025-01-15 10:00|2025-01-15 11:00||, Event 2|2025-01-15 14:00|2025-01-15 15:00|Location A|');

      const result = await server.listTodayEvents({ calendar: 'Personal' });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.events).toBeDefined();
      expect(result.content[0].text).toContain('Event 1');
      expect(result.content[0].text).toContain('Event 2');
    });

    it('should handle empty results', async () => {
      mockExecSync.mockReturnValue('""');

      const result = await server.listTodayEvents({ calendar: 'Personal' });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.events).toEqual([]);
    });

    it('should handle calendar not found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error(`Calendar doesn't understand the "calendar" message`);
      });

      await expect(server.listTodayEvents({ calendar: 'NonExistent' })).rejects.toThrow(/Calendar.*not found/i);
    });
  });

  describe('listWeekEvents', () => {
    it('should validate weekStart is required', async () => {
      await expect(server.listWeekEvents({})).rejects.toThrow(/Missing required parameter.*weekStart/i);
    });

    it('should validate weekStart format', async () => {
      await expect(
        server.listWeekEvents({ weekStart: 'invalid' })
      ).rejects.toThrow(/Date format error/i);
    });

    it('should return week events', async () => {
      mockExecSync.mockReturnValue('Event 1|2025-01-15 10:00|2025-01-15 11:00||');

      const result = await server.listWeekEvents({
        weekStart: '2025-01-15',
        calendar: 'Work',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.events).toBeDefined();
      expect(result.content[0].text).toContain('Event 1');
    });

    it('should handle empty results', async () => {
      mockExecSync.mockReturnValue('""');

      const result = await server.listWeekEvents({
        weekStart: '2025-01-15',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.events).toEqual([]);
    });
  });

  describe('searchEvents', () => {
    it('should validate query is required', async () => {
      await expect(server.searchEvents({})).rejects.toThrow(/Missing required parameter.*query/i);
    });

    it('should validate query is not empty', async () => {
      await expect(server.searchEvents({ query: '' })).rejects.toThrow(/query string is empty/i);
    });

    it('should return matching events', async () => {
      mockExecSync.mockReturnValue('Meeting|2025-01-15 10:00|2025-01-15 11:00|Description|Location');

      const result = await server.searchEvents({
        query: 'meeting',
        calendar: 'Work',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.events).toBeDefined();
      expect(result.content[0].text).toContain('Meeting');
    });

    it('should handle no matches', async () => {
      mockExecSync.mockReturnValue('""');

      const result = await server.searchEvents({
        query: 'nonexistent',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.events).toEqual([]);
    });

    it('should handle calendar not found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error(`Calendar doesn't understand the "calendar" message`);
      });

      await expect(
        server.searchEvents({ query: 'test', calendar: 'NonExistent' })
      ).rejects.toThrow(/Calendar.*not found/i);
    });
  });

  describe('fixEventTimes', () => {
    it('should validate datePattern is required', async () => {
      await expect(server.fixEventTimes({})).rejects.toThrow(/Missing required parameter.*datePattern/i);
    });

    it('should validate corrections array is required', async () => {
      await expect(
        server.fixEventTimes({ datePattern: '2025-01-15' })
      ).rejects.toThrow(/Missing required parameter.*corrections/i);
    });

    it('should fix event times successfully', async () => {
      mockExecSync.mockReturnValue('2');

      const result = await server.fixEventTimes({
        calendar: 'Work',
        datePattern: '2025-01-15',
        corrections: [
          { keyword: 'Meeting', newStartTime: '14:00', newEndTime: '15:00' },
        ],
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.successCount).toBeGreaterThan(0);
      expect(result.content[0].text).toContain('Meeting');
    });

    it('should handle no matches', async () => {
      mockExecSync.mockReturnValue('0');

      const result = await server.fixEventTimes({
        calendar: 'Work',
        datePattern: '2025-01-15',
        corrections: [
          { keyword: 'Nonexistent', newStartTime: '14:00', newEndTime: '15:00' },
        ],
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.results.some(r => r.error && r.error.includes('No matching events'))).toBe(true);
    });

    it('should handle date format errors', async () => {
      const result = await server.fixEventTimes({
        calendar: 'Work',
        datePattern: '2025-01-15',
        corrections: [
          { keyword: 'Meeting', newStartTime: 'invalid', newEndTime: '15:00' },
        ],
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.results.some(r => !r.success && r.error)).toBe(true);
      expect(result.content[0].text).toMatch(/Date format error|format.*invalid/i);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error for calendar not found', async () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error(`62:84: execution error: Calendar got an error: Can't get calendar "NonExistent". (-1728)`);
        throw error;
      });

      await expect(
        server.createEvent({
          title: 'Test',
          startDate: '2025-01-15 14:00',
          endDate: '2025-01-15 15:00',
          calendar: 'NonExistent',
        })
      ).rejects.toThrow(/Calendar.*not found/i);
    });
  });
});

