#!/usr/bin/env node

// Load environment variables from .env file (if present)
import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import express from 'express';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get all network interfaces with their IP addresses formatted for display
 * @param {number} port - The port number to include in URLs
 * @returns {Array<{name: string, address: string, url: string}>} Array of interface info
 */
function getNetworkInterfaces(port) {
  const interfaces = networkInterfaces();
  const result = [];
  const seenAddresses = new Set();

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;

    for (const addr of addresses) {
      // Skip IPv6 and internal addresses (except localhost)
      if (addr.family === 'IPv6') continue;
      if (addr.internal && addr.address !== '127.0.0.1') continue;

      // Skip duplicate addresses
      if (seenAddresses.has(addr.address)) continue;
      seenAddresses.add(addr.address);

      // Format interface name for display
      let displayName = name;

      // Detect localhost
      if (addr.address === '127.0.0.1' || name === 'lo0') {
        displayName = 'localhost';
      }
      // Detect Tailscale (100.x.x.x is Tailscale's IPv4 range, or utun* with 100.x.x.x)
      else if (addr.address.startsWith('100.') || (name.startsWith('utun') && addr.address.startsWith('100.'))) {
        displayName = 'Tailscale';
      }
      // Detect WiFi (en0 is typically WiFi on macOS)
      else if (name === 'en0' || name.toLowerCase().includes('wifi') || name.toLowerCase().includes('wi-fi')) {
        displayName = 'Wi-Fi';
      }
      // Detect Ethernet (en1, en2, etc. are typically Ethernet on macOS, but not en0)
      else if (name.match(/^en[1-9]\d*$/) || name.toLowerCase().includes('ethernet')) {
        displayName = 'Ethernet';
      }
      // Keep original name for other interfaces
      else {
        displayName = name;
      }

      result.push({
        name: displayName,
        address: addr.address,
        url: `http://${addr.address}:${port}/mcp`
      });
    }
  }

  // Sort: localhost first, then by priority (Tailscale, Wi-Fi, Ethernet), then alphabetically
  const priority = { 'localhost': 0, 'Tailscale': 1, 'Wi-Fi': 2, 'Ethernet': 3 };
  result.sort((a, b) => {
    const aPriority = priority[a.name] ?? 99;
    const bPriority = priority[b.name] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export class MacOSCalendarServer {
  constructor() {
    this.server = new Server(
      {
        name: 'macos-calendar-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // 列出工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list-calendars',
            description: '列出所有macOS日历',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'create-event',
            description: '在macOS日历中创建新事件',
            inputSchema: {
              type: 'object',
              properties: {
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '个人',
                },
                title: {
                  type: 'string',
                  description: '事件标题',
                },
                startDate: {
                  type: 'string',
                  description: '开始时间，格式：YYYY-MM-DD HH:MM',
                },
                endDate: {
                  type: 'string',
                  description: '结束时间，格式：YYYY-MM-DD HH:MM',
                },
                description: {
                  type: 'string',
                  description: '事件描述',
                  default: '',
                },
                location: {
                  type: 'string',
                  description: '事件地点',
                  default: '',
                },
              },
              required: ['title', 'startDate', 'endDate'],
              additionalProperties: false,
            },
          },
          {
            name: 'create-batch-events',
            description: '批量创建事件',
            inputSchema: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      startDate: { type: 'string' },
                      endDate: { type: 'string' },
                      description: { type: 'string', default: '' },
                      location: { type: 'string', default: '' },
                    },
                    required: ['title', 'startDate', 'endDate'],
                  },
                  description: '事件列表',
                },
                calendar: {
                  type: 'string',
                  description: '目标日历',
                  default: '工作',
                },
              },
              required: ['events'],
              additionalProperties: false,
            },
          },
          {
            name: 'delete-events-by-keyword',
            description: '根据关键词删除事件',
            inputSchema: {
              type: 'object',
              properties: {
                keyword: {
                  type: 'string',
                  description: '要删除的事件关键词',
                },
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '工作',
                },
                confirm: {
                  type: 'boolean',
                  description: '确认删除',
                  default: false,
                },
              },
              required: ['keyword'],
              additionalProperties: false,
            },
          },
          {
            name: 'list-today-events',
            description: '列出今天的事件',
            inputSchema: {
              type: 'object',
              properties: {
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '个人',
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'list-week-events',
            description: '列出指定周的事件',
            inputSchema: {
              type: 'object',
              properties: {
                weekStart: {
                  type: 'string',
                  description: '周开始日期，格式：YYYY-MM-DD',
                },
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '工作',
                },
              },
              required: ['weekStart'],
              additionalProperties: false,
            },
          },
          {
            name: 'search-events',
            description: '搜索事件',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '搜索关键词',
                },
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '个人',
                },
              },
              required: ['query'],
              additionalProperties: false,
            },
          },
          {
            name: 'fix-event-times',
            description: '修正错误的事件时间（从凌晨修正到正确时间）',
            inputSchema: {
              type: 'object',
              properties: {
                calendar: {
                  type: 'string',
                  description: '日历名称',
                  default: '工作',
                },
                datePattern: {
                  type: 'string',
                  description: '目标日期模式，如：2025-07-10',
                },
                corrections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string', description: '事件关键词' },
                      newStartTime: { type: 'string', description: '新开始时间 HH:MM' },
                      newEndTime: { type: 'string', description: '新结束时间 HH:MM' }
                    },
                    required: ['keyword', 'newStartTime', 'newEndTime']
                  },
                  description: '时间修正列表'
                }
              },
              required: ['calendar', 'datePattern', 'corrections'],
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // 调用工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'list-calendars':
            return await this.listCalendars();
          case 'create-event':
            return await this.createEvent(args);
          case 'create-batch-events':
            return await this.createBatchEvents(args);
          case 'delete-events-by-keyword':
            return await this.deleteEventsByKeyword(args);
          case 'list-today-events':
            return await this.listTodayEvents(args);
          case 'list-week-events':
            return await this.listWeekEvents(args);
          case 'search-events':
            return await this.searchEvents(args);
          case 'fix-event-times':
            return await this.fixEventTimes(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // 修复时间格式转换 - 使用原生macOS时间设置避免时区问题
  formatDateForAppleScript(dateStr) {
    // 输入格式：YYYY-MM-DD HH:MM
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    if (!year || !month || !day || hour === undefined || minute === undefined) {
      throw new Error(`无效的日期格式: ${dateStr}，请使用 YYYY-MM-DD HH:MM 格式`);
    }

    return {
      year,
      month,
      day,
      hour,
      minute
    };
  }

  // 生成AppleScript时间设置代码
  generateTimeScript(dateInfo, variableName = 'eventDate') {
    return `
      set ${variableName} to current date
      set year of ${variableName} to ${dateInfo.year}
      set month of ${variableName} to ${dateInfo.month}
      set day of ${variableName} to ${dateInfo.day}
      set time of ${variableName} to (${dateInfo.hour} * hours + ${dateInfo.minute} * minutes)
    `;
  }

  async listCalendars() {
    try {
      const script = `tell application "Calendar" to get name of calendars`;
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const calendars = result.trim().split(', ');

      return {
        content: [
          {
            type: 'text',
            text: `📅 可用日历 (${calendars.length}个):\n${calendars.map(cal => `• ${cal}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      let errorMessage = `❌ 获取日历列表失败: ${error.message}`;

      if (error.message.includes('not allowed') || error.message.includes('permission')) {
        errorMessage += `\n\n⚠️ 权限错误：macOS 需要授予 Calendar 应用权限。\n请检查：系统设置 → 隐私与安全性 → 日历 → 确保终端（或你的应用）已获得访问权限。`;
      } else if (error.message.includes('not found') || error.message.includes('Calendar.app')) {
        errorMessage += `\n\n⚠️ Calendar 应用未找到。请确保 macOS Calendar 应用已安装且可访问。`;
      }

      throw new Error(errorMessage);
    }
  }

  async createEvent(args) {
    // Validation
    if (!args.title) {
      throw new Error(`❌ 验证错误：缺少必需参数 "title"。\n请提供事件标题。示例: {"title": "Team Meeting", "startDate": "2025-01-15 14:00", "endDate": "2025-01-15 15:00"}`);
    }
    if (!args.startDate) {
      throw new Error(`❌ 验证错误：缺少必需参数 "startDate"。\n请使用格式: YYYY-MM-DD HH:MM (24小时制)。示例: "2025-01-15 14:00"`);
    }
    if (!args.endDate) {
      throw new Error(`❌ 验证错误：缺少必需参数 "endDate"。\n请使用格式: YYYY-MM-DD HH:MM (24小时制)。示例: "2025-01-15 15:00"`);
    }

    const { calendar = '个人', title, startDate, endDate, description = '', location = '' } = args;

    let startInfo, endInfo;
    try {
      startInfo = this.formatDateForAppleScript(startDate);
    } catch (error) {
      throw new Error(`❌ 日期格式错误：startDate "${startDate}" 格式无效。\n预期格式: YYYY-MM-DD HH:MM (24小时制)\n示例: "2025-01-15 14:30"\n你提供的: "${startDate}"`);
    }

    try {
      endInfo = this.formatDateForAppleScript(endDate);
    } catch (error) {
      throw new Error(`❌ 日期格式错误：endDate "${endDate}" 格式无效。\n预期格式: YYYY-MM-DD HH:MM (24小时制)\n示例: "2025-01-15 15:30"\n你提供的: "${endDate}"`);
    }

    const startTimeScript = this.generateTimeScript(startInfo, 'startTime');
    const endTimeScript = this.generateTimeScript(endInfo, 'endTime');

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"

        ${startTimeScript}
        ${endTimeScript}

        make new event at end of events of theCalendar with properties {summary:"${title}", start date:startTime, end date:endTime, description:"${description}", location:"${location}"}
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      return {
        content: [
          {
            type: 'text',
            text: `✅ 事件创建成功！\n📅 日历: ${calendar}\n📝 标题: ${title}\n🕒 时间: ${startDate} - ${endDate}\n📍 地点: ${location || '无'}\n📄 描述: ${description || '无'}`,
          },
        ],
      };
    } catch (error) {
      let errorMessage = `❌ 创建事件失败: ${error.message}`;

      if (error.message.includes(`doesn't understand the "calendar" message`) ||
          error.message.includes(`Can't get calendar`) ||
          error.message.includes(`can't get calendar`)) {
        errorMessage += `\n\n⚠️ 日历 "${calendar}" 未找到。\n请使用 list-calendars 工具查看可用的日历名称。\n注意：日历名称区分大小写，必须完全匹配。`;
      } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
        errorMessage += `\n\n⚠️ 权限错误：macOS 需要授予 Calendar 应用权限。\n请检查：系统设置 → 隐私与安全性 → 日历 → 确保终端（或你的应用）已获得访问权限。`;
      }

      throw new Error(errorMessage);
    }
  }

  async createBatchEvents(args) {
    // Validation
    if (!args.events || !Array.isArray(args.events)) {
      throw new Error(`❌ 验证错误：缺少必需参数 "events" 或格式不正确。\n请提供一个事件数组。示例: {"events": [{"title": "Event 1", "startDate": "2025-01-15 14:00", "endDate": "2025-01-15 15:00"}]}`);
    }
    if (args.events.length === 0) {
      throw new Error(`❌ 验证错误：事件数组为空。\n请提供至少一个事件。`);
    }

    const { events, calendar = '工作' } = args;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const event of events) {
      try {
        // Validate individual event
        if (!event.title) {
          results.push(`❌ ${event.title || '(未命名)'} - 验证失败: 缺少必需参数 "title"`);
          failCount++;
          continue;
        }
        if (!event.startDate) {
          results.push(`❌ ${event.title} - 验证失败: 缺少必需参数 "startDate"。预期格式: YYYY-MM-DD HH:MM`);
          failCount++;
          continue;
        }
        if (!event.endDate) {
          results.push(`❌ ${event.title} - 验证失败: 缺少必需参数 "endDate"。预期格式: YYYY-MM-DD HH:MM`);
          failCount++;
          continue;
        }

        let startInfo, endInfo;
        try {
          startInfo = this.formatDateForAppleScript(event.startDate);
        } catch (error) {
          results.push(`❌ ${event.title} - 日期格式错误: startDate "${event.startDate}" 格式无效。预期格式: YYYY-MM-DD HH:MM`);
          failCount++;
          continue;
        }

        try {
          endInfo = this.formatDateForAppleScript(event.endDate);
        } catch (error) {
          results.push(`❌ ${event.title} - 日期格式错误: endDate "${event.endDate}" 格式无效。预期格式: YYYY-MM-DD HH:MM`);
          failCount++;
          continue;
        }

        const startTimeScript = this.generateTimeScript(startInfo, 'startTime');
        const endTimeScript = this.generateTimeScript(endInfo, 'endTime');

        const script = `
          tell application "Calendar"
            set theCalendar to calendar "${calendar}"

            ${startTimeScript}
            ${endTimeScript}

            make new event at end of events of theCalendar with properties {summary:"${event.title}", start date:startTime, end date:endTime, description:"${event.description || ''}", location:"${event.location || ''}"}
          end tell
        `;

        execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
        results.push(`✅ ${event.title} - ${event.startDate}`);
        successCount++;
      } catch (error) {
        let errorMsg = error.message;
        if (error.message.includes(`doesn't understand the "calendar" message`)) {
          errorMsg = `日历 "${calendar}" 未找到。请使用 list-calendars 查看可用日历`;
        } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
          errorMsg = `权限错误。请检查系统设置 → 隐私与安全性 → 日历`;
        }
        results.push(`❌ ${event.title || '(未命名)'} - 失败: ${errorMsg}`);
        failCount++;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `📊 批量创建结果:\n成功: ${successCount}个\n失败: ${failCount}个\n\n详细结果:\n${results.join('\n')}`,
        },
      ],
    };
  }

  async deleteEventsByKeyword(args) {
    const { keyword, calendar = '工作', confirm = false } = args;

    if (!confirm) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ 请确认删除操作！\n将删除日历"${calendar}"中包含关键词"${keyword}"的所有事件。\n要执行删除，请设置 confirm: true`,
          },
        ],
      };
    }

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set allEvents to every event of theCalendar
        set deletedCount to 0

        repeat with anEvent in reverse of allEvents
          if (summary of anEvent) contains "${keyword}" then
            delete anEvent
            set deletedCount to deletedCount + 1
          end if
        end repeat

        return deletedCount
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const deletedCount = parseInt(result.trim()) || 0;

      return {
        content: [
          {
            type: 'text',
            text: `🗑️ 删除完成！\n删除了 ${deletedCount} 个包含"${keyword}"的事件`,
          },
        ],
      };
    } catch (error) {
      let errorMessage = `❌ 删除事件失败: ${error.message}`;

      if (!args.keyword) {
        errorMessage = `❌ 验证错误：缺少必需参数 "keyword"。\n请提供要删除的事件关键词。`;
      } else if (error.message.includes(`doesn't understand the "calendar" message`)) {
        errorMessage += `\n\n⚠️ 日历 "${calendar}" 未找到。\n请使用 list-calendars 工具查看可用的日历名称。\n注意：日历名称区分大小写，必须完全匹配。`;
      } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
        errorMessage += `\n\n⚠️ 权限错误：macOS 需要授予 Calendar 应用权限。\n请检查：系统设置 → 隐私与安全性 → 日历 → 确保终端（或你的应用）已获得访问权限。`;
      }

      throw new Error(errorMessage);
    }
  }

  async listTodayEvents(args) {
    const { calendar = '个人' } = args;

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set todayStart to (current date) - (time of (current date))
        set todayEnd to todayStart + (24 * hours) - 1

        set todayEvents to every event of theCalendar whose start date ≥ todayStart and start date ≤ todayEnd

        set eventList to {}
        repeat with anEvent in todayEvents
          set eventInfo to (summary of anEvent) & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & (description of anEvent) & "|" & (location of anEvent)
          set end of eventList to eventInfo
        end repeat

        return eventList as string
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const events = result.trim();

      if (!events || events === '""') {
        return {
          content: [
            {
              type: 'text',
              text: `📅 ${calendar} - 今日无事件`,
            },
          ],
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, desc, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}${desc ? `\n📄 ${desc}` : ''}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📅 ${calendar} - 今日事件:\n\n${eventList}`,
          },
        ],
      };
    } catch (error) {
      let errorMessage = `❌ 获取今日事件失败: ${error.message}`;

      if (error.message.includes(`doesn't understand the "calendar" message`) ||
          error.message.includes(`Can't get calendar`) ||
          error.message.includes(`can't get calendar`)) {
        errorMessage += `\n\n⚠️ 日历 "${calendar}" 未找到。\n请使用 list-calendars 工具查看可用的日历名称。\n注意：日历名称区分大小写，必须完全匹配。`;
      } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
        errorMessage += `\n\n⚠️ 权限错误：macOS 需要授予 Calendar 应用权限。\n请检查：系统设置 → 隐私与安全性 → 日历 → 确保终端（或你的应用）已获得访问权限。`;
      }

      throw new Error(errorMessage);
    }
  }

  async listWeekEvents(args) {
    const { weekStart, calendar = '工作' } = args;

    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    const formattedStart = this.formatDateForAppleScript(weekStart + ' 00:00');
    const formattedEnd = this.formatDateForAppleScript(endDate.toISOString().split('T')[0] + ' 00:00');

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set weekStart to date "${formattedStart}"
        set weekEnd to date "${formattedEnd}"

        set weekEvents to every event of theCalendar whose start date ≥ weekStart and start date < weekEnd

        set eventList to {}
        repeat with anEvent in weekEvents
          set eventInfo to (summary of anEvent) & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & (location of anEvent)
          set end of eventList to eventInfo
        end repeat

        return eventList as string
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const events = result.trim();

      if (!events || events === '""') {
        return {
          content: [
            {
              type: 'text',
              text: `📅 ${calendar} - ${weekStart}这周无事件`,
            },
          ],
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📅 ${calendar} - ${weekStart}这周的事件:\n\n${eventList}`,
          },
        ],
      };
    } catch (error) {
      let errorMessage = `❌ 获取周事件失败: ${error.message}`;

      if (!args.weekStart) {
        errorMessage = `❌ 验证错误：缺少必需参数 "weekStart"。\n请使用格式: YYYY-MM-DD。示例: "2025-01-15"`;
      } else {
        try {
          this.formatDateForAppleScript(args.weekStart + ' 00:00');
        } catch (dateError) {
          errorMessage = `❌ 日期格式错误：weekStart "${args.weekStart}" 格式无效。\n预期格式: YYYY-MM-DD\n示例: "2025-01-15"\n你提供的: "${args.weekStart}"`;
        }
      }

      if (error.message.includes(`doesn't understand the "calendar" message`)) {
        errorMessage += `\n\n⚠️ 日历 "${calendar}" 未找到。\n请使用 list-calendars 工具查看可用的日历名称。`;
      } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
        errorMessage += `\n\n⚠️ 权限错误：macOS 需要授予 Calendar 应用权限。\n请检查：系统设置 → 隐私与安全性 → 日历`;
      }

      throw new Error(errorMessage);
    }
  }

  async searchEvents(args) {
    const { query, calendar = '个人' } = args;

    const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"
        set allEvents to every event of theCalendar

        set matchingEvents to {}
        repeat with anEvent in allEvents
          if (summary of anEvent) contains "${query}" or (description of anEvent) contains "${query}" then
            set eventInfo to (summary of anEvent) & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & (description of anEvent) & "|" & (location of anEvent)
            set end of matchingEvents to eventInfo
          end if
        end repeat

        return matchingEvents as string
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const events = result.trim();

      if (!events || events === '""') {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 在 ${calendar} 中未找到包含 "${query}" 的事件`,
            },
          ],
        };
      }

      const eventList = events.split(',').map(event => {
        const [title, start, end, desc, loc] = event.trim().split('|');
        return `📝 ${title}\n🕒 ${start} - ${end}${loc ? `\n📍 ${loc}` : ''}${desc ? `\n📄 ${desc}` : ''}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 在 ${calendar} 中找到 ${events.split(',').length} 个匹配事件:\n\n${eventList}`,
          },
        ],
      };
    } catch (error) {
      let errorMessage = `❌ 搜索事件失败: ${error.message}`;

      if (!args.query || args.query.trim() === '') {
        errorMessage = `❌ 验证错误：缺少必需参数 "query" 或查询字符串为空。\n请提供搜索关键词。示例: {"query": "meeting"}`;
      } else if (error.message.includes(`doesn't understand the "calendar" message`)) {
        errorMessage += `\n\n⚠️ 日历 "${calendar}" 未找到。\n请使用 list-calendars 工具查看可用的日历名称。\n注意：日历名称区分大小写，必须完全匹配。`;
      } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
        errorMessage += `\n\n⚠️ 权限错误：macOS 需要授予 Calendar 应用权限。\n请检查：系统设置 → 隐私与安全性 → 日历 → 确保终端（或你的应用）已获得访问权限。`;
      }

      throw new Error(errorMessage);
    }
  }

  async fixEventTimes(args) {
    // Validation
    if (!args.datePattern) {
      throw new Error(`❌ 验证错误：缺少必需参数 "datePattern"。\n请使用格式: YYYY-MM-DD。示例: "2025-01-15"`);
    }
    if (!args.corrections || !Array.isArray(args.corrections) || args.corrections.length === 0) {
      throw new Error(`❌ 验证错误：缺少必需参数 "corrections" 或数组为空。\n请提供一个修正数组。示例: {"datePattern": "2025-01-15", "corrections": [{"keyword": "Meeting", "newStartTime": "14:00", "newEndTime": "15:00"}]}`);
    }

    const { calendar = '工作', datePattern, corrections } = args;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const correction of corrections) {
      try {
        // 构建正确的日期时间
        const newStartDateTime = `${datePattern} ${correction.newStartTime}`;
        const newEndDateTime = `${datePattern} ${correction.newEndTime}`;

        const startInfo = this.formatDateForAppleScript(newStartDateTime);
        const endInfo = this.formatDateForAppleScript(newEndDateTime);

        const startTimeScript = this.generateTimeScript(startInfo, 'newStartTime');
        const endTimeScript = this.generateTimeScript(endInfo, 'newEndTime');

        const script = `
          tell application "Calendar"
            set theCalendar to calendar "${calendar}"
            set allEvents to every event of theCalendar
            set fixedCount to 0

            ${startTimeScript}
            ${endTimeScript}

            repeat with anEvent in allEvents
              if (summary of anEvent) contains "${correction.keyword}" then
                set start date of anEvent to newStartTime
                set end date of anEvent to newEndTime
                set fixedCount to fixedCount + 1
              end if
            end repeat

            return fixedCount
          end tell
        `;

        const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
        const fixedCount = parseInt(result.trim()) || 0;

        if (fixedCount > 0) {
          results.push(`✅ "${correction.keyword}" - 修正了 ${fixedCount} 个事件到 ${correction.newStartTime}-${correction.newEndTime}`);
          successCount += fixedCount;
        } else {
          results.push(`⚠️ "${correction.keyword}" - 未找到匹配的事件`);
        }
      } catch (error) {
        let errorMsg = error.message;
        if (!correction.keyword) {
          errorMsg = `缺少必需参数 "keyword"`;
        } else if (!correction.newStartTime) {
          errorMsg = `缺少必需参数 "newStartTime"。预期格式: HH:MM (24小时制)`;
        } else if (!correction.newEndTime) {
          errorMsg = `缺少必需参数 "newEndTime"。预期格式: HH:MM (24小时制)`;
        } else if (error.message.includes(`doesn't understand the "calendar" message`)) {
          errorMsg = `日历 "${calendar}" 未找到。请使用 list-calendars 查看可用日历`;
        } else if (error.message.includes('not allowed') || error.message.includes('permission')) {
          errorMsg = `权限错误。请检查系统设置 → 隐私与安全性 → 日历`;
        }
        results.push(`❌ "${correction.keyword || '(未指定)'}" - 修正失败: ${errorMsg}`);
        failCount++;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔧 时间修正结果:\n成功修正: ${successCount}个事件\n失败: ${failCount}个修正\n\n详细结果:\n${results.join('\n')}`,
        },
      ],
    };
  }

  async run() {
    const transportMode = process.env.MCP_TRANSPORT || 'stdio';

    if (transportMode === 'http') {
      await this.runHTTP();
    } else {
      await this.runStdio();
    }
  }

  async runStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('macOS Calendar MCP Server running on stdio');
  }

  async runHTTP() {
    const app = express();
    app.use(express.json());

    const host = process.env.MCP_HTTP_HOST || '0.0.0.0';
    const port = parseInt(process.env.MCP_HTTP_PORT || '3000', 10);

    // Map to store transports by session ID
    const transports = {};

    // MCP POST endpoint
    const mcpPostHandler = async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];

      try {
        let transport;
        if (sessionId && transports[sessionId]) {
          // Reuse existing transport
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              console.error(`Session initialized with ID: ${sessionId}`);
              transports[sessionId] = transport;
            }
          });

          // Set up onclose handler to clean up transport
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && transports[sid]) {
              console.error(`Transport closed for session ${sid}`);
              delete transports[sid];
            }
          };

          // Connect the transport to the MCP server
          await this.server.connect(transport);
          await transport.handleRequest(req, res, req.body);
          return; // Already handled
        } else {
          // Invalid request - no session ID or not initialization request
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided'
            },
            id: null
          });
          return;
        }

        // Handle the request with existing transport
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error'
            },
            id: null
          });
        }
      }
    };

    // Handle GET requests for SSE streams
    const mcpGetHandler = async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }

      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    };

    // Handle DELETE requests for session termination
    const mcpDeleteHandler = async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }

      try {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('Error handling session termination:', error);
        if (!res.headersSent) {
          res.status(500).send('Error processing session termination');
        }
      }
    };

    // Set up routes
    app.post('/mcp', mcpPostHandler);
    app.get('/mcp', mcpGetHandler);
    app.delete('/mcp', mcpDeleteHandler);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.listen(port, host, () => {
      console.error(`macOS Calendar MCP Server running on http://${host}:${port}/mcp`);

      // Display all available network interfaces
      const interfaces = getNetworkInterfaces(port);
      if (interfaces.length > 0) {
        console.error('\n📡 Server accessible on:');
        for (const iface of interfaces) {
          console.error(`   ${iface.name.padEnd(12)} → ${iface.url}`);
        }
      }
    });

    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.error('Shutting down server...');
      for (const sessionId in transports) {
        try {
          await transports[sessionId].close();
          delete transports[sessionId];
        } catch (error) {
          console.error(`Error closing transport for session ${sessionId}:`, error);
        }
      }
      process.exit(0);
    });
  }
}

const server = new MacOSCalendarServer();
server.run().catch(console.error);
