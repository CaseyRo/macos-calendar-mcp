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
      }).toThrow(/无效的日期格式/);
    });

    it('should throw error for missing time', () => {
      expect(() => {
        server.formatDateForAppleScript('2025-01-15');
      }).toThrow(/无效的日期格式/);
    });
  });

  describe('listCalendars', () => {
    it('should return list of calendars', async () => {
      mockExecSync.mockReturnValue('Personal, Work, Family');

      const result = await server.listCalendars();

      expect(result.content[0].text).toContain('可用日历');
      expect(result.content[0].text).toContain('Personal');
      expect(result.content[0].text).toContain('Work');
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

      await expect(server.listCalendars()).rejects.toThrow(/权限错误/);
    });
  });

  describe('createEvent', () => {
    it('should validate required parameters', async () => {
      await expect(server.createEvent({})).rejects.toThrow(/缺少必需参数/);
    });

    it('should validate date format', async () => {
      await expect(
        server.createEvent({
          title: 'Test Event',
          startDate: 'invalid',
          endDate: '2025-01-15 15:00',
        })
      ).rejects.toThrow(/日期格式错误/);
    });

    it('should create event successfully', async () => {
      mockExecSync.mockReturnValue('');

      const result = await server.createEvent({
        title: 'Test Event',
        startDate: '2025-01-15 14:00',
        endDate: '2025-01-15 15:00',
        calendar: 'Personal',
      });

      expect(result.content[0].text).toContain('事件创建成功');
      expect(result.content[0].text).toContain('Test Event');
    });
  });

  describe('createBatchEvents', () => {
    it('should validate events array is required', async () => {
      await expect(server.createBatchEvents({})).rejects.toThrow(/缺少必需参数 "events"/);
    });

    it('should validate events array is not empty', async () => {
      await expect(server.createBatchEvents({ events: [] })).rejects.toThrow(/事件数组为空/);
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

      expect(result.content[0].text).toContain('成功: 2个');
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

      expect(result.content[0].text).toContain('成功: 1个');
      expect(result.content[0].text).toContain('失败: 1个');
    });

    it('should validate individual event parameters', async () => {
      const result = await server.createBatchEvents({
        events: [
          { title: 'Valid Event', startDate: '2025-01-15 10:00', endDate: '2025-01-15 11:00' },
          { startDate: '2025-01-15 14:00', endDate: '2025-01-15 15:00' }, // Missing title
        ],
      });

      expect(result.content[0].text).toContain('失败');
      expect(result.content[0].text).toContain('缺少必需参数 "title"');
    });
  });

  describe('deleteEventsByKeyword', () => {
    it('should require confirmation', async () => {
      const result = await server.deleteEventsByKeyword({
        keyword: 'test',
      });

      expect(result.content[0].text).toContain('请确认删除操作');
      expect(result.content[0].text).toContain('confirm: true');
    });

    it('should delete events with confirmation', async () => {
      mockExecSync.mockReturnValue('5');

      const result = await server.deleteEventsByKeyword({
        keyword: 'test',
        confirm: true,
        calendar: 'Work',
      });

      expect(result.content[0].text).toContain('删除完成');
      expect(result.content[0].text).toContain('5 个');
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
      ).rejects.toThrow(/日历.*未找到/);
    });
  });

  describe('listTodayEvents', () => {
    it('should return today events', async () => {
      mockExecSync.mockReturnValue('Event 1|2025-01-15 10:00|2025-01-15 11:00||, Event 2|2025-01-15 14:00|2025-01-15 15:00|Location A|');

      const result = await server.listTodayEvents({ calendar: 'Personal' });

      expect(result.content[0].text).toContain('今日事件');
      expect(result.content[0].text).toContain('Event 1');
      expect(result.content[0].text).toContain('Event 2');
    });

    it('should handle empty results', async () => {
      mockExecSync.mockReturnValue('""');

      const result = await server.listTodayEvents({ calendar: 'Personal' });

      expect(result.content[0].text).toContain('今日无事件');
    });

    it('should handle calendar not found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error(`Calendar doesn't understand the "calendar" message`);
      });

      await expect(server.listTodayEvents({ calendar: 'NonExistent' })).rejects.toThrow(/日历.*未找到/);
    });
  });

  describe('listWeekEvents', () => {
    it('should validate weekStart is required', async () => {
      await expect(server.listWeekEvents({})).rejects.toThrow(/缺少必需参数 "weekStart"/);
    });

    it('should validate weekStart format', async () => {
      await expect(
        server.listWeekEvents({ weekStart: 'invalid' })
      ).rejects.toThrow(/日期格式错误/);
    });

    it('should return week events', async () => {
      mockExecSync.mockReturnValue('Event 1|2025-01-15 10:00|2025-01-15 11:00||');

      const result = await server.listWeekEvents({
        weekStart: '2025-01-15',
        calendar: 'Work',
      });

      expect(result.content[0].text).toContain('这周的事件');
      expect(result.content[0].text).toContain('Event 1');
    });

    it('should handle empty results', async () => {
      mockExecSync.mockReturnValue('""');

      const result = await server.listWeekEvents({
        weekStart: '2025-01-15',
      });

      expect(result.content[0].text).toContain('无事件');
    });
  });

  describe('searchEvents', () => {
    it('should validate query is required', async () => {
      await expect(server.searchEvents({})).rejects.toThrow(/缺少必需参数 "query"/);
    });

    it('should validate query is not empty', async () => {
      await expect(server.searchEvents({ query: '' })).rejects.toThrow(/查询字符串为空/);
    });

    it('should return matching events', async () => {
      mockExecSync.mockReturnValue('Meeting|2025-01-15 10:00|2025-01-15 11:00|Description|Location');

      const result = await server.searchEvents({
        query: 'meeting',
        calendar: 'Work',
      });

      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('Meeting');
    });

    it('should handle no matches', async () => {
      mockExecSync.mockReturnValue('""');

      const result = await server.searchEvents({
        query: 'nonexistent',
      });

      expect(result.content[0].text).toContain('未找到');
    });

    it('should handle calendar not found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error(`Calendar doesn't understand the "calendar" message`);
      });

      await expect(
        server.searchEvents({ query: 'test', calendar: 'NonExistent' })
      ).rejects.toThrow(/日历.*未找到/);
    });
  });

  describe('fixEventTimes', () => {
    it('should validate datePattern is required', async () => {
      await expect(server.fixEventTimes({})).rejects.toThrow(/缺少必需参数 "datePattern"/);
    });

    it('should validate corrections array is required', async () => {
      await expect(
        server.fixEventTimes({ datePattern: '2025-01-15' })
      ).rejects.toThrow(/缺少必需参数 "corrections"/);
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

      expect(result.content[0].text).toContain('成功修正');
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

      expect(result.content[0].text).toContain('未找到匹配的事件');
    });

    it('should handle date format errors', async () => {
      const result = await server.fixEventTimes({
        calendar: 'Work',
        datePattern: '2025-01-15',
        corrections: [
          { keyword: 'Meeting', newStartTime: 'invalid', newEndTime: '15:00' },
        ],
      });

      expect(result.content[0].text).toContain('失败');
      expect(result.content[0].text).toContain('日期格式错误');
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
      ).rejects.toThrow(/日历.*未找到/);
    });
  });
});

