#!/usr/bin/env node
/** @format */

// Load environment variables from .env file (if present)
import dotenvx from "@dotenvx/dotenvx";
dotenvx.config();

import { initI18n, t } from "./i18n.js";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { execSync, spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import { randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import express from "express";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";

/**
 * Clean up log files older than the configured retention period
 * @param {string} logDirectory - Directory containing log files (default: './logs')
 * @param {number} retentionDays - Number of days to retain logs (default: 30)
 */
async function cleanupLogFiles(logDirectory = "./logs", retentionDays = 30) {
    try {
        // Parse retention days from environment or use default
        const retentionDaysEnv = process.env.LOG_RETENTION_DAYS;
        const retentionDaysValue = retentionDaysEnv ? parseInt(retentionDaysEnv, 10) : retentionDays;

        if (isNaN(retentionDaysValue) || retentionDaysValue < 0) {
            console.error(`[log-cleanup] Invalid LOG_RETENTION_DAYS value: ${retentionDaysEnv}, using default: ${retentionDays}`);
            return;
        }

        const retentionMs = retentionDaysValue * 24 * 60 * 60 * 1000;
        const cutoffDate = Date.now() - retentionMs;

        let deletedCount = 0;
        let errorCount = 0;

        try {
            const files = await readdir(logDirectory);
            const logFilePattern = /\.(log|txt)$/i;

            for (const file of files) {
                if (!logFilePattern.test(file)) continue;

                try {
                    const filePath = join(logDirectory, file);
                    const stats = await stat(filePath);

                    if (stats.mtimeMs < cutoffDate) {
                        await unlink(filePath);
                        deletedCount++;
                        if (process.env.DEBUG) {
                            console.error(`[log-cleanup] Deleted log file: ${file} (${Math.round((Date.now() - stats.mtimeMs) / (24 * 60 * 60 * 1000))} days old)`);
                        }
                    }
                } catch (fileError) {
                    errorCount++;
                    console.error(`[log-cleanup] Error processing file ${file}:`, fileError.message);
                }
            }

            if (deletedCount > 0 || errorCount > 0) {
                console.error(`[log-cleanup] Cleanup complete: ${deletedCount} file(s) deleted, ${errorCount} error(s)`);
            }
        } catch (dirError) {
            // Directory doesn't exist or can't be read - this is fine, just log and continue
            if (process.env.DEBUG) {
                console.error(`[log-cleanup] Log directory not found or not accessible: ${logDirectory}`);
            }
        }
    } catch (error) {
        // Don't let cleanup errors interrupt server startup
        console.error(`[log-cleanup] Error during log cleanup:`, error.message);
        if (process.env.DEBUG) {
            console.error(`[log-cleanup] Debug error details:`, error);
        }
    }
}

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
            if (addr.family === "IPv6") continue;
            if (addr.internal && addr.address !== "127.0.0.1") continue;

            // Skip duplicate addresses
            if (seenAddresses.has(addr.address)) continue;
            seenAddresses.add(addr.address);

            // Format interface name for display
            let displayName = name;

            // Detect localhost
            if (addr.address === "127.0.0.1" || name === "lo0") {
                displayName = "localhost";
            }
            // Detect Tailscale (100.x.x.x is Tailscale's IPv4 range, or utun* with 100.x.x.x)
            else if (addr.address.startsWith("100.") || (name.startsWith("utun") && addr.address.startsWith("100."))) {
                displayName = "Tailscale";
            }
            // Detect WiFi (en0 is typically WiFi on macOS)
            else if (name === "en0" || name.toLowerCase().includes("wifi") || name.toLowerCase().includes("wi-fi")) {
                displayName = "Wi-Fi";
            }
            // Detect Ethernet (en1, en2, etc. are typically Ethernet on macOS, but not en0)
            else if (name.match(/^en[1-9]\d*$/) || name.toLowerCase().includes("ethernet")) {
                displayName = "Ethernet";
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
    const priority = { localhost: 0, Tailscale: 1, "Wi-Fi": 2, Ethernet: 3 };
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
                name: "macos-calendar-mcp",
                version: "2.0.0"
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        // Initialize i18n with language from environment variable (default: en)
        const language = process.env.LANGUAGE || "en";
        try {
            initI18n(language);
        } catch (error) {
            console.error(`[i18n] Failed to initialize i18n: ${error.message}`);
            // Fallback to English if initialization fails
            try {
                initI18n("en");
            } catch (fallbackError) {
                console.error(`[i18n] Failed to initialize i18n with fallback: ${fallbackError.message}`);
            }
        }

        this.setupToolHandlers();
    }

    setupToolHandlers() {
        // List tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "list-calendars",
                        description: t("tools.listCalendars.description"),
                        inputSchema: {
                            type: "object",
                            properties: {},
                            additionalProperties: false
                        }
                    },
                    {
                        name: "create-event",
                        description: t("tools.createEvent.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                calendar: {
                                    type: "string",
                                    description: t("tools.createEvent.calendar"),
                                    default: t("tools.createEvent.calendarDefault")
                                },
                                title: {
                                    type: "string",
                                    description: t("tools.createEvent.title")
                                },
                                startDate: {
                                    type: "string",
                                    description: t("tools.createEvent.startDate")
                                },
                                endDate: {
                                    type: "string",
                                    description: t("tools.createEvent.endDate")
                                },
                                description: {
                                    type: "string",
                                    description: t("tools.createEvent.description"),
                                    default: ""
                                },
                                location: {
                                    type: "string",
                                    description: t("tools.createEvent.location"),
                                    default: ""
                                },
                                allDay: {
                                    type: "boolean",
                                    description: t("tools.createEvent.allDay"),
                                    default: false
                                }
                            },
                            required: ["title", "startDate", "endDate"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "create-batch-events",
                        description: t("tools.createBatchEvents.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                events: {
                                    type: "array",
                                    description: t("tools.createBatchEvents.events"),
                                    items: {
                                        type: "object",
                                        properties: {
                                            title: {
                                                type: "string",
                                                description: t("tools.createEvent.title")
                                            },
                                            startDate: {
                                                type: "string",
                                                description: t("tools.createEvent.startDate")
                                            },
                                            endDate: {
                                                type: "string",
                                                description: t("tools.createEvent.endDate")
                                            },
                                            description: {
                                                type: "string",
                                                description: t("tools.createEvent.description"),
                                                default: ""
                                            },
                                            location: {
                                                type: "string",
                                                description: t("tools.createEvent.location"),
                                                default: ""
                                            },
                                            allDay: {
                                                type: "boolean",
                                                description: t("tools.createEvent.allDay"),
                                                default: false
                                            }
                                        },
                                        required: ["title", "startDate", "endDate"],
                                        additionalProperties: false
                                    }
                                },
                                calendar: {
                                    type: "string",
                                    description: t("tools.createBatchEvents.targetCalendar"),
                                    default: t("tools.createBatchEvents.targetCalendarDefault")
                                }
                            },
                            required: ["events"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "delete-events-by-keyword",
                        description: t("tools.deleteEventsByKeyword.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                keyword: {
                                    type: "string",
                                    description: t("tools.deleteEventsByKeyword.keyword")
                                },
                                calendar: {
                                    type: "string",
                                    description: t("tools.deleteEventsByKeyword.calendar"),
                                    default: t("tools.deleteEventsByKeyword.calendarDefault")
                                },
                                confirm: {
                                    type: "boolean",
                                    description: t("tools.deleteEventsByKeyword.confirm"),
                                    default: false
                                }
                            },
                            required: ["keyword"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "list-today-events",
                        description: t("tools.listTodayEvents.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                calendar: {
                                    type: "string",
                                    description: t("tools.listTodayEvents.calendar"),
                                    default: t("tools.listTodayEvents.calendarDefault")
                                }
                            },
                            additionalProperties: false
                        }
                    },
                    {
                        name: "list-week-events",
                        description: t("tools.listWeekEvents.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                weekStart: {
                                    type: "string",
                                    description: t("tools.listWeekEvents.weekStart")
                                },
                                calendar: {
                                    type: "string",
                                    description: t("tools.listWeekEvents.calendar"),
                                    default: t("tools.listWeekEvents.calendarDefault")
                                }
                            },
                            required: ["weekStart"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "search-events",
                        description: t("tools.searchEvents.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: t("tools.searchEvents.query")
                                },
                                calendar: {
                                    type: "string",
                                    description: t("tools.searchEvents.calendar"),
                                    default: t("tools.searchEvents.calendarDefault")
                                }
                            },
                            required: ["query"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "fix-event-times",
                        description: t("tools.fixEventTimes.description"),
                        inputSchema: {
                            type: "object",
                            properties: {
                                calendar: {
                                    type: "string",
                                    description: t("tools.fixEventTimes.calendar"),
                                    default: t("tools.fixEventTimes.calendarDefault")
                                },
                                datePattern: {
                                    type: "string",
                                    description: t("tools.fixEventTimes.datePattern")
                                },
                                corrections: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            keyword: { type: "string", description: t("tools.fixEventTimes.eventKeyword") },
                                            newStartTime: { type: "string", description: t("tools.fixEventTimes.newStartTime") },
                                            newEndTime: { type: "string", description: t("tools.fixEventTimes.newEndTime") }
                                        },
                                        required: ["keyword", "newStartTime", "newEndTime"]
                                    },
                                    description: t("tools.fixEventTimes.corrections")
                                }
                            },
                            required: ["calendar", "datePattern", "corrections"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "search",
                        description: "Search calendar events (OpenAI-compatible). Returns events matching the query across all calendars.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "Search query string"
                                }
                            },
                            required: ["query"],
                            additionalProperties: false
                        }
                    },
                    {
                        name: "fetch",
                        description: "Fetch complete event details by ID (OpenAI-compatible). Returns full event information for citation and analysis.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "Event ID from search results"
                                }
                            },
                            required: ["id"],
                            additionalProperties: false
                        }
                    }
                ]
            };
        });

        // Call tools
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;

                switch (name) {
                    case "list-calendars":
                        return await this.listCalendars();
                    case "create-event":
                        return await this.createEvent(args);
                    case "create-batch-events":
                        return await this.createBatchEvents(args);
                    case "delete-events-by-keyword":
                        return await this.deleteEventsByKeyword(args);
                    case "list-today-events":
                        return await this.listTodayEvents(args);
                    case "list-week-events":
                        return await this.listWeekEvents(args);
                    case "search-events":
                        return await this.searchEvents(args);
                    case "fix-event-times":
                        return await this.fixEventTimes(args);
                    case "search":
                        return await this.search(args);
                    case "fetch":
                        return await this.fetch(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                // Try to parse error message as JSON, otherwise create a JSON error object
                let errorObj;
                try {
                    errorObj = JSON.parse(error.message);
                } catch (parseError) {
                    errorObj = { error: error.message };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(errorObj)
                        }
                    ],
                    isError: true
                };
            }
        });
    }

    // Fix time format conversion - use native macOS time settings to avoid timezone issues
    formatDateForAppleScript(dateStr) {
        // Input format: YYYY-MM-DD HH:MM
        const [datePart, timePart] = dateStr.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);

        if (!year || !month || !day || hour === undefined || minute === undefined) {
            throw new Error(t("errors.invalidDateFormat", { dateStr }));
        }

        return {
            year,
            month,
            day,
            hour,
            minute
        };
    }

    // Generate AppleScript time setting code
    generateTimeScript(dateInfo, variableName = "eventDate") {
        return `
      set ${variableName} to current date
      set year of ${variableName} to ${dateInfo.year}
      set month of ${variableName} to ${dateInfo.month}
      set day of ${variableName} to ${dateInfo.day}
      set time of ${variableName} to (${dateInfo.hour} * hours + ${dateInfo.minute} * minutes)
    `;
    }

    // Adjust date to all-day event start time (00:00 of the day)
    adjustDateForAllDayStart(dateStr) {
        const [datePart] = dateStr.split(" ");
        return `${datePart} 00:00`;
    }

    // Adjust date to all-day event end time (00:00 of the day after end date)
    adjustDateForAllDayEnd(dateStr) {
        const [datePart] = dateStr.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + 1);
        const nextYear = date.getFullYear();
        const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
        const nextDay = String(date.getDate()).padStart(2, "0");
        return `${nextYear}-${nextMonth}-${nextDay} 00:00`;
    }

    async listCalendars() {
        try {
            const script = `tell application "Calendar" to get name of calendars`;
            const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
            const calendars = result.trim().split(", ");

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ calendars })
                    }
                ]
            };
        } catch (error) {
            let errorMessage = t("errors.failedToListCalendars", { error: error.message });
            let errorDetails = { error: errorMessage };

            if (error.message.includes("not allowed") || error.message.includes("permission")) {
                errorDetails.permissionError = true;
                errorDetails.suggestion = t("errors.permissionError");
            } else if (error.message.includes("not found") || error.message.includes("Calendar.app")) {
                errorDetails.suggestion = t("errors.calendarAppNotFound");
            }

            throw new Error(JSON.stringify(errorDetails));
        }
    }

    async createEvent(args) {
        // Validation
        if (!args.title) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.missingTitle"),
                    suggestion: t("errors.missingTitleSuggestion")
                })
            );
        }
        if (!args.startDate) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.missingStartDate"),
                    expectedFormat: t("errors.dateFormatExpected"),
                    example: "2025-01-15 14:00"
                })
            );
        }
        if (!args.endDate) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.missingEndDate"),
                    expectedFormat: t("errors.dateFormatExpected"),
                    example: "2025-01-15 15:00"
                })
            );
        }

        const { calendar = t("tools.createEvent.calendarDefault"), title, startDate, endDate, description = "", location = "", allDay = false } = args;

        // For all-day events, adjust dates: start to 00:00 on start date, end to 00:00 on day after end date
        const adjustedStartDate = allDay ? this.adjustDateForAllDayStart(startDate) : startDate;
        const adjustedEndDate = allDay ? this.adjustDateForAllDayEnd(endDate) : endDate;

        let startInfo, endInfo;
        try {
            startInfo = this.formatDateForAppleScript(adjustedStartDate);
        } catch (error) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.dateFormatError", { field: "startDate", value: startDate }),
                    expectedFormat: t("errors.dateFormatExpected"),
                    example: t("errors.dateFormatExample"),
                    provided: startDate
                })
            );
        }

        try {
            endInfo = this.formatDateForAppleScript(adjustedEndDate);
        } catch (error) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.dateFormatError", { field: "endDate", value: endDate }),
                    expectedFormat: t("errors.dateFormatExpected"),
                    example: t("errors.dateFormatExample"),
                    provided: endDate
                })
            );
        }

        const startTimeScript = this.generateTimeScript(startInfo, "startTime");
        const endTimeScript = this.generateTimeScript(endInfo, "endTime");

        // Add allday event property when allDay is true
        const alldayProperty = allDay ? ", allday event:true" : "";

        const script = `
      tell application "Calendar"
        set theCalendar to calendar "${calendar}"

        ${startTimeScript}
        ${endTimeScript}

        make new event at end of events of theCalendar with properties {summary:"${title}", start date:startTime, end date:endTime, description:"${description}", location:"${location}"${alldayProperty}}
      end tell
    `;

        try {
            const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            calendar,
                            event: {
                                title,
                                startDate,
                                endDate,
                                description,
                                location,
                                allDay
                            }
                        })
                    }
                ]
            };
        } catch (error) {
            let errorMessage = t("errors.failedToCreateEvent", { error: error.message });
            let errorDetails = { error: errorMessage };

            if (error.message.includes(`doesn't understand the "calendar" message`) || error.message.includes(`Can't get calendar`) || error.message.includes(`can't get calendar`)) {
                errorDetails.calendarNotFound = true;
                errorDetails.suggestion = t("errors.calendarNotFound", { calendar });
            } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                errorDetails.permissionError = true;
                errorDetails.suggestion = t("errors.permissionError");
            }

            throw new Error(JSON.stringify(errorDetails));
        }
    }

    async createBatchEvents(args) {
        // Validation
        if (!args.events || !Array.isArray(args.events)) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.missingEvents"),
                    suggestion: t("errors.missingEventsSuggestion")
                })
            );
        }
        if (args.events.length === 0) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.emptyEventsArray"),
                    suggestion: t("errors.emptyEventsArraySuggestion")
                })
            );
        }

        const { events, calendar = t("tools.createBatchEvents.targetCalendarDefault") } = args;
        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const event of events) {
            try {
                // Validate individual event
                if (!event.title) {
                    results.push({
                        success: false,
                        title: event.title || t("errors.unnamedEvent"),
                        error: t("errors.missingTitle")
                    });
                    failCount++;
                    continue;
                }
                if (!event.startDate) {
                    results.push({
                        success: false,
                        title: event.title,
                        error: t("errors.missingStartDate") + " " + t("errors.dateFormatExpected")
                    });
                    failCount++;
                    continue;
                }
                if (!event.endDate) {
                    results.push({
                        success: false,
                        title: event.title,
                        error: t("errors.missingEndDate") + " " + t("errors.dateFormatExpected")
                    });
                    failCount++;
                    continue;
                }

                const eventAllDay = event.allDay || false;

                // For all-day events, adjust dates: start to 00:00 on start date, end to 00:00 on day after end date
                const adjustedStartDate = eventAllDay ? this.adjustDateForAllDayStart(event.startDate) : event.startDate;
                const adjustedEndDate = eventAllDay ? this.adjustDateForAllDayEnd(event.endDate) : event.endDate;

                let startInfo, endInfo;
                try {
                    startInfo = this.formatDateForAppleScript(adjustedStartDate);
                } catch (error) {
                    results.push({
                        success: false,
                        title: event.title,
                        error: t("errors.dateFormatError", { field: "startDate", value: event.startDate }) + " " + t("errors.dateFormatExpected")
                    });
                    failCount++;
                    continue;
                }

                try {
                    endInfo = this.formatDateForAppleScript(adjustedEndDate);
                } catch (error) {
                    results.push({
                        success: false,
                        title: event.title,
                        error: t("errors.dateFormatError", { field: "endDate", value: event.endDate }) + " " + t("errors.dateFormatExpected")
                    });
                    failCount++;
                    continue;
                }

                const startTimeScript = this.generateTimeScript(startInfo, "startTime");
                const endTimeScript = this.generateTimeScript(endInfo, "endTime");

                // Add allday event property when allDay is true
                const alldayProperty = eventAllDay ? ", allday event:true" : "";

                const script = `
          tell application "Calendar"
            set theCalendar to calendar "${calendar}"

            ${startTimeScript}
            ${endTimeScript}

            make new event at end of events of theCalendar with properties {summary:"${event.title}", start date:startTime, end date:endTime, description:"${event.description || ""}", location:"${event.location || ""}"${alldayProperty}}
          end tell
        `;

                execSync(`osascript -e '${script}'`, { encoding: "utf8" });
                results.push({
                    success: true,
                    title: event.title,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    allDay: eventAllDay
                });
                successCount++;
            } catch (error) {
                let errorMsg = error.message;
                if (error.message.includes(`doesn't understand the "calendar" message`)) {
                    errorMsg = t("errors.calendarNotFoundShort", { calendar });
                } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                    errorMsg = t("errors.permissionErrorShort");
                }
                results.push({
                    success: false,
                    title: event.title || t("errors.unnamedEvent"),
                    error: errorMsg
                });
                failCount++;
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        successCount,
                        failCount,
                        calendar,
                        results
                    })
                }
            ]
        };
    }

    async deleteEventsByKeyword(args) {
        const { keyword, calendar = t("tools.deleteEventsByKeyword.calendarDefault"), confirm = false } = args;

        if (!confirm) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            requiresConfirmation: true,
                            message: t("errors.deleteConfirmationRequired", { calendar, keyword }),
                            suggestion: t("errors.deleteConfirmationSuggestion"),
                            keyword,
                            calendar
                        })
                    }
                ]
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
            const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
            const deletedCount = parseInt(result.trim()) || 0;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            deletedCount,
                            keyword,
                            calendar
                        })
                    }
                ]
            };
        } catch (error) {
            let errorMessage = t("errors.failedToDeleteEvents", { error: error.message });
            let errorDetails = { error: errorMessage };

            if (!args.keyword) {
                errorDetails = { error: t("errors.missingKeyword") };
            } else if (error.message.includes(`doesn't understand the "calendar" message`)) {
                errorDetails.calendarNotFound = true;
                errorDetails.suggestion = t("errors.calendarNotFound", { calendar });
            } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                errorDetails.permissionError = true;
                errorDetails.suggestion = t("errors.permissionError");
            }

            throw new Error(JSON.stringify(errorDetails));
        }
    }

    async listTodayEvents(args) {
        const { calendar = t("tools.listTodayEvents.calendarDefault") } = args;

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
            const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
            const events = result.trim();

            if (!events || events === '""') {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                calendar,
                                events: []
                            })
                        }
                    ]
                };
            }

            const eventList = events.split(",").map((event) => {
                const [title, start, end, desc, loc] = event.trim().split("|");
                return {
                    title: title || "",
                    startDate: start || "",
                    endDate: end || "",
                    description: desc || "",
                    location: loc || ""
                };
            });

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            calendar,
                            events: eventList
                        })
                    }
                ]
            };
        } catch (error) {
            let errorMessage = t("errors.failedToListTodayEvents", { error: error.message });
            let errorDetails = { error: errorMessage };

            if (error.message.includes(`doesn't understand the "calendar" message`) || error.message.includes(`Can't get calendar`) || error.message.includes(`can't get calendar`)) {
                errorDetails.calendarNotFound = true;
                errorDetails.suggestion = t("errors.calendarNotFound", { calendar });
            } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                errorDetails.permissionError = true;
                errorDetails.suggestion = t("errors.permissionError");
            }

            throw new Error(JSON.stringify(errorDetails));
        }
    }

    async listWeekEvents(args) {
        const { weekStart, calendar = t("tools.listWeekEvents.calendarDefault") } = args;

        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const formattedStart = this.formatDateForAppleScript(weekStart + " 00:00");
        const formattedEnd = this.formatDateForAppleScript(endDate.toISOString().split("T")[0] + " 00:00");

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
            const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
            const events = result.trim();

            if (!events || events === '""') {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                calendar,
                                weekStart,
                                events: []
                            })
                        }
                    ]
                };
            }

            const eventList = events.split(",").map((event) => {
                const [title, start, end, loc] = event.trim().split("|");
                return {
                    title: title || "",
                    startDate: start || "",
                    endDate: end || "",
                    location: loc || ""
                };
            });

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            calendar,
                            weekStart,
                            events: eventList
                        })
                    }
                ]
            };
        } catch (error) {
            let errorMessage = t("errors.failedToListWeekEvents", { error: error.message });
            let errorDetails = { error: errorMessage };

            if (!args.weekStart) {
                errorDetails = { error: t("errors.missingWeekStart") };
            } else {
                try {
                    this.formatDateForAppleScript(args.weekStart + " 00:00");
                } catch (dateError) {
                    errorDetails = {
                        error: t("errors.weekStartFormatError", { value: args.weekStart }),
                        expectedFormat: t("errors.weekStartExpectedFormat"),
                        example: t("errors.weekStartExample"),
                        provided: args.weekStart
                    };
                }
            }

            if (error.message.includes(`doesn't understand the "calendar" message`)) {
                errorDetails.calendarNotFound = true;
                if (!errorDetails.suggestion) errorDetails.suggestion = "";
                errorDetails.suggestion += t("errors.calendarNotFound", { calendar });
            } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                errorDetails.permissionError = true;
                if (!errorDetails.suggestion) errorDetails.suggestion = "";
                errorDetails.suggestion += t("errors.permissionError");
            }

            throw new Error(JSON.stringify(errorDetails));
        }
    }

    async searchEvents(args) {
        const { query, calendar = t("tools.searchEvents.calendarDefault") } = args;

        console.error(`[search-events] Starting search for query: "${query}" in calendar: "${calendar}"`);

        // Escape quotes for AppleScript
        const escapedCalendar = calendar.replace(/"/g, '\\"');
        const escapedQuery = query.replace(/"/g, '\\"');

        // Optimized script with date filtering and event limits
        const script = `tell application "Calendar"
    set theCalendar to calendar "${escapedCalendar}"
    set searchStart to (current date) - (365 * days)
    set searchEnd to (current date) + (365 * days)
    set allEvents to (every event of theCalendar whose start date ≥ searchStart and start date ≤ searchEnd)
    set eventCount to count of allEvents
    if eventCount > 200 then
        set allEvents to items 1 thru 200 of allEvents
    end if
    set matchingEvents to {}
    set errorCount to 0
    set errorDetails to {}
    repeat with anEvent in allEvents
        try
            set eventSummary to summary of anEvent
            set eventDesc to description of anEvent
            set eventLoc to location of anEvent
            if eventSummary contains "${escapedQuery}" or eventDesc contains "${escapedQuery}" or eventLoc contains "${escapedQuery}" then
                set eventInfo to eventSummary & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & eventDesc & "|" & eventLoc
                set end of matchingEvents to eventInfo
            end if
        on error errorMessage number errorNumber
            set errorCount to errorCount + 1
            set errorInfo to "Error " & errorNumber & ": " & errorMessage
            set end of errorDetails to errorInfo
            -- Log error to stderr (will be captured by Node.js)
            try
                do shell script "echo '[AppleScript Error] " & errorInfo & "' >&2"
            end try
        end try
    end repeat
    if errorCount > 0 then
        return "ERROR_COUNT:" & errorCount & "|ERRORS:" & (errorDetails as string) & "|" & (matchingEvents as string)
    end if
    return matchingEvents as string
end tell`;

        try {
            // Use async exec with timeout to prevent hanging
            const timeout = 20000; // 20 second timeout
            let childProcess;
            let timeoutId;

            const execPromise = new Promise((resolve, reject) => {
                const startTime = Date.now();
                // Escape single quotes in script for shell execution
                const escapedScript = script.replace(/'/g, "'\\''");
                childProcess = exec(
                    `osascript -e '${escapedScript}'`,
                    {
                        encoding: "utf8",
                        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                    },
                    (error, stdout, stderr) => {
                        const duration = Date.now() - startTime;
                        console.error(`[search-events] Calendar "${calendar}" completed in ${duration}ms`);

                        if (error) {
                            // Log the actual error details from osascript
                            console.error(`[search-events] Error in calendar "${calendar}":`, error.message);
                            if (stderr) {
                                console.error(`[search-events] AppleScript stderr:`, stderr);
                            }
                            if (stdout) {
                                console.error(`[search-events] AppleScript stdout:`, stdout);
                            }
                            if (process.env.DEBUG) {
                                console.error(`[search-events] Full error object:`, error);
                                console.error(`[search-events] Error code:`, error.code);
                                console.error(`[search-events] Error signal:`, error.signal);
                            }
                            reject(error);
                        } else {
                            resolve({ stdout, stderr });
                        }
                    }
                );
            });

            // Add timeout that kills the process
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    console.error(`[search-events] Timeout after ${timeout}ms for calendar "${calendar}"`);
                    if (childProcess && !childProcess.killed) {
                        console.error(`[search-events] Killing process for calendar "${calendar}"`);
                        childProcess.kill("SIGTERM");
                        setTimeout(() => {
                            if (childProcess && !childProcess.killed) {
                                console.error(`[search-events] Force killing process for calendar "${calendar}"`);
                                childProcess.kill("SIGKILL");
                            }
                        }, 1000);
                    }
                    reject(new Error(`Search timeout after ${timeout}ms for calendar "${calendar}"`));
                }, timeout);
            });

            let result;
            try {
                result = await Promise.race([execPromise, timeoutPromise]);
                clearTimeout(timeoutId);
            } catch (timeoutError) {
                clearTimeout(timeoutId);
                throw timeoutError;
            }

            let events = (result.stdout || "").trim();

            // Log stderr if present (contains AppleScript error details)
            if (result.stderr && result.stderr.trim()) {
                console.error(`[search-events] AppleScript stderr for calendar "${calendar}":`, result.stderr.trim());
            }

            // Check for error count from AppleScript
            let errorCount = 0;
            let errorDetails = [];
            if (events.startsWith("ERROR_COUNT:")) {
                const parts = events.split("|");
                errorCount = parseInt(parts[0].replace("ERROR_COUNT:", ""), 10) || 0;

                // Extract error details if present
                if (parts[1] && parts[1].startsWith("ERRORS:")) {
                    const errorDetailsStr = parts[1].replace("ERRORS:", "");
                    errorDetails = errorDetailsStr ? errorDetailsStr.split(", ") : [];
                    events = parts.slice(2).join("|") || "";
                } else {
                    events = parts[1] || "";
                }

                if (errorCount > 0) {
                    console.error(`[search-events] Encountered ${errorCount} error(s) while processing events in calendar "${calendar}"`);
                    if (errorDetails.length > 0) {
                        console.error(`[search-events] Error details:`, errorDetails);
                    }
                    if (process.env.DEBUG) {
                        console.error(`[search-events] Debug: ${errorCount} event(s) failed to process in calendar "${calendar}"`);
                        console.error(`[search-events] Debug: Events that succeeded: ${events ? events.split(",").length : 0}`);
                    }
                }
            }

            if (!events || events === '""') {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                calendar,
                                query,
                                events: []
                            })
                        }
                    ]
                };
            }

            const eventList = events.split(",").map((event) => {
                const [title, start, end, desc, loc] = event.trim().split("|");
                return {
                    title: title || "",
                    startDate: start || "",
                    endDate: end || "",
                    description: desc || "",
                    location: loc || ""
                };
            });

            console.error(`[search-events] Found ${eventList.length} events in calendar "${calendar}"${errorCount > 0 ? ` (${errorCount} error(s) encountered)` : ""}`);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            calendar,
                            query,
                            events: eventList
                        })
                    }
                ]
            };
        } catch (error) {
            // Log full error details to console for debugging
            console.error(`[search-events] Fatal error:`, error.message);
            if (process.env.DEBUG) {
                console.error(`[search-events] Debug error stack:`, error.stack);
            }

            // Create user-friendly error message without internal details
            let errorMessage = t("errors.failedToSearchEvents", { error: error.message });
            let errorDetails = { error: errorMessage };

            if (!args.query || args.query.trim() === "") {
                errorDetails = {
                    error: t("errors.missingQuery"),
                    suggestion: t("errors.missingQuerySuggestion")
                };
            } else if (error.message.includes(`doesn't understand the "calendar" message`)) {
                errorDetails.calendarNotFound = true;
                errorDetails.suggestion = t("errors.calendarNotFound", { calendar });
            } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                errorDetails.permissionError = true;
                errorDetails.suggestion = t("errors.permissionError");
            } else if (error.message.includes("timeout")) {
                errorDetails.timeout = true;
                errorDetails.suggestion = t("errors.searchTimeout", { calendar });
            }

            throw new Error(JSON.stringify(errorDetails));
        }
    }

    async fixEventTimes(args) {
        // Validation
        if (!args.datePattern) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.missingDatePattern"),
                    expectedFormat: t("errors.weekStartExpectedFormat"),
                    example: t("errors.weekStartExample")
                })
            );
        }
        if (!args.corrections || !Array.isArray(args.corrections) || args.corrections.length === 0) {
            throw new Error(
                JSON.stringify({
                    error: t("errors.missingCorrections"),
                    suggestion: t("errors.missingCorrectionsSuggestion")
                })
            );
        }

        const { calendar = t("tools.fixEventTimes.calendarDefault"), datePattern, corrections } = args;
        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const correction of corrections) {
            try {
                // Build correct date time
                const newStartDateTime = `${datePattern} ${correction.newStartTime}`;
                const newEndDateTime = `${datePattern} ${correction.newEndTime}`;

                const startInfo = this.formatDateForAppleScript(newStartDateTime);
                const endInfo = this.formatDateForAppleScript(newEndDateTime);

                const startTimeScript = this.generateTimeScript(startInfo, "newStartTime");
                const endTimeScript = this.generateTimeScript(endInfo, "newEndTime");

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

                const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
                const fixedCount = parseInt(result.trim()) || 0;

                if (fixedCount > 0) {
                    results.push({
                        keyword: correction.keyword,
                        fixedCount,
                        newStartTime: correction.newStartTime,
                        newEndTime: correction.newEndTime
                    });
                    successCount += fixedCount;
                } else {
                    results.push({
                        keyword: correction.keyword,
                        fixedCount: 0,
                        error: t("errors.noMatchingEvents")
                    });
                }
            } catch (error) {
                let errorMsg = error.message;
                if (!correction.keyword) {
                    errorMsg = t("errors.missingRequiredParam", { param: "keyword" });
                } else if (!correction.newStartTime) {
                    errorMsg = t("errors.missingNewStartTime");
                } else if (!correction.newEndTime) {
                    errorMsg = t("errors.missingNewEndTime");
                } else if (error.message.includes(`doesn't understand the "calendar" message`)) {
                    errorMsg = t("errors.calendarNotFoundShort", { calendar });
                } else if (error.message.includes("not allowed") || error.message.includes("permission")) {
                    errorMsg = t("errors.permissionErrorShort");
                }
                results.push({
                    keyword: correction.keyword || t("errors.unspecifiedKeyword"),
                    fixedCount: 0,
                    error: errorMsg
                });
                failCount++;
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        successCount,
                        failCount,
                        calendar,
                        datePattern,
                        results
                    })
                }
            ]
        };
    }

    // Helper function to generate stable event ID
    generateEventId(calendarName, title, startDate) {
        // Sanitize title for use in ID (remove special chars, limit length)
        const sanitizedTitle = title
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase()
            .substring(0, 50);

        // Format start date as ISO string (YYYY-MM-DDTHH:MM:SS)
        const dateStr = startDate instanceof Date ? startDate.toISOString().replace(/[:.]/g, "-").substring(0, 19) : startDate.toString().replace(/[:.]/g, "-").substring(0, 19);

        // Sanitize calendar name
        const sanitizedCalendar = calendarName
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase();

        return `calendar-event-${sanitizedCalendar}-${sanitizedTitle}-${dateStr}`;
    }

    // Helper function to generate event URL
    generateEventUrl(eventId) {
        return `calendar://event/${eventId}`;
    }

    // Helper function to parse event ID and extract components
    parseEventId(eventId) {
        // Format: calendar-event-{calendar}-{title}-{date}
        // The date part might contain dashes, so we need to be careful
        // Date format is YYYY-MM-DDTHH-MM-SS (with dashes replacing colons)
        const match = eventId.match(/^calendar-event-(.+?)-(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        if (!match) {
            return null;
        }
        return {
            calendar: match[1].replace(/-/g, " "),
            title: match[2].replace(/-/g, " "),
            date: match[3].replace(/-/g, ":").replace("T", "T") // Restore ISO format
        };
    }

    // OpenAI-compatible search tool
    async search(args) {
        const { query } = args;

        if (!query || !query.trim()) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ results: [] })
                    }
                ]
            };
        }

        try {
            console.error(`[search] Starting search for query: "${query}"`);

            // Get all calendars first
            const calendarsScript = `tell application "Calendar" to get name of calendars`;
            const calendarsResult = execSync(`osascript -e '${calendarsScript}'`, { encoding: "utf8" });
            const calendars = calendarsResult
                .trim()
                .split(", ")
                .filter((cal) => cal && cal.trim());

            console.error(`[search] Found ${calendars.length} calendars to search`);
            const allResults = [];

            // Search across all calendars
            for (const calendar of calendars) {
                try {
                    console.error(`[search] Searching calendar: "${calendar}"`);

                    // Escape quotes in calendar name and query for AppleScript
                    const escapedCalendar = calendar.replace(/"/g, '\\"');
                    const escapedQuery = query.replace(/"/g, '\\"');

                    // Optimize search: only search events from the past year to future
                    // This prevents searching through thousands of old events which causes hanging
                    // Build script without comments to avoid shell parsing issues
                    // Further optimized: limit to 200 events and exit early at 50 matches
                    const script = `tell application "Calendar"
    set theCalendar to calendar "${escapedCalendar}"
    set searchStart to (current date) - (365 * days)
    set searchEnd to (current date) + (365 * days)
    set allEvents to (every event of theCalendar whose start date ≥ searchStart and start date ≤ searchEnd)
    set eventCount to count of allEvents
    if eventCount > 200 then
        set allEvents to items 1 thru 200 of allEvents
    end if
    set matchingEvents to {}
    set maxResults to 50
    set errorCount to 0
    set errorDetails to {}
    repeat with anEvent in allEvents
        try
            if (count of matchingEvents) ≥ maxResults then exit repeat
            set eventSummary to summary of anEvent
            set eventDesc to description of anEvent
            set eventLoc to location of anEvent
            if eventSummary contains "${escapedQuery}" or eventDesc contains "${escapedQuery}" or eventLoc contains "${escapedQuery}" then
                set eventInfo to eventSummary & "|" & (start date of anEvent) & "|" & (end date of anEvent) & "|" & eventDesc & "|" & eventLoc
                set end of matchingEvents to eventInfo
            end if
        on error errorMessage number errorNumber
            set errorCount to errorCount + 1
            set errorInfo to "Error " & errorNumber & ": " & errorMessage
            set end of errorDetails to errorInfo
            -- Log error to stderr (will be captured by Node.js)
            try
                do shell script "echo '[AppleScript Error] " & errorInfo & "' >&2"
            end try
        end try
    end repeat
    if errorCount > 0 then
        return "ERROR_COUNT:" & errorCount & "|ERRORS:" & (errorDetails as string) & "|" & (matchingEvents as string)
    end if
    return matchingEvents as string
end tell`;

                    // Use execAsync with timeout to prevent hanging
                    // This prevents the process from blocking indefinitely
                    const timeout = 20000; // 20 second timeout per calendar (increased for large calendars with 200 events)
                    let childProcess;
                    let timeoutId;

                    const execPromise = new Promise((resolve, reject) => {
                        const startTime = Date.now();
                        // Escape single quotes in script for shell execution
                        const escapedScript = script.replace(/'/g, "'\\''");
                        childProcess = exec(
                            `osascript -e '${escapedScript}'`,
                            {
                                encoding: "utf8",
                                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                            },
                            (error, stdout, stderr) => {
                                const duration = Date.now() - startTime;
                                console.error(`[search] Calendar "${calendar}" completed in ${duration}ms`);

                                if (error) {
                                    // Log the actual error details from osascript
                                    console.error(`[search] Error in calendar "${calendar}":`, error.message);
                                    if (stderr) {
                                        console.error(`[search] AppleScript stderr:`, stderr);
                                    }
                                    if (stdout) {
                                        console.error(`[search] AppleScript stdout:`, stdout);
                                    }
                                    if (process.env.DEBUG) {
                                        console.error(`[search] Full error object:`, error);
                                        console.error(`[search] Error code:`, error.code);
                                        console.error(`[search] Error signal:`, error.signal);
                                    }
                                    reject(error);
                                } else {
                                    resolve({ stdout, stderr });
                                }
                            }
                        );
                    });

                    // Add timeout that kills the process
                    const timeoutPromise = new Promise((_, reject) => {
                        timeoutId = setTimeout(() => {
                            console.error(`[search] Timeout after ${timeout}ms for calendar "${calendar}"`);
                            if (childProcess && !childProcess.killed) {
                                console.error(`[search] Killing process for calendar "${calendar}"`);
                                childProcess.kill("SIGTERM");
                                // Force kill after a short delay if still running
                                setTimeout(() => {
                                    if (childProcess && !childProcess.killed) {
                                        console.error(`[search] Force killing process for calendar "${calendar}"`);
                                        childProcess.kill("SIGKILL");
                                    }
                                }, 1000);
                            }
                            reject(new Error(`Search timeout after ${timeout}ms for calendar "${calendar}"`));
                        }, timeout);
                    });

                    let events = "";
                    try {
                        const result = await Promise.race([execPromise, timeoutPromise]);
                        clearTimeout(timeoutId);
                        events = (result.stdout || "").trim();

                        // Log stderr if present (contains AppleScript error details)
                        if (result.stderr && result.stderr.trim()) {
                            console.error(`[search] AppleScript stderr for calendar "${calendar}":`, result.stderr.trim());
                        }

                        // Check for error count from AppleScript
                        let errorCount = 0;
                        let errorDetails = [];
                        if (events.startsWith("ERROR_COUNT:")) {
                            const parts = events.split("|");
                            errorCount = parseInt(parts[0].replace("ERROR_COUNT:", ""), 10) || 0;

                            // Extract error details if present
                            if (parts[1] && parts[1].startsWith("ERRORS:")) {
                                const errorDetailsStr = parts[1].replace("ERRORS:", "");
                                errorDetails = errorDetailsStr ? errorDetailsStr.split(", ") : [];
                                events = parts.slice(2).join("|") || "";
                            } else {
                                events = parts[1] || "";
                            }

                            if (errorCount > 0) {
                                console.error(`[search] Encountered ${errorCount} error(s) while processing events in calendar "${calendar}"`);
                                if (errorDetails.length > 0) {
                                    console.error(`[search] Error details:`, errorDetails);
                                }
                                if (process.env.DEBUG) {
                                    console.error(`[search] Debug: ${errorCount} event(s) failed to process in calendar "${calendar}"`);
                                    console.error(`[search] Debug: Events that succeeded: ${events ? events.split(",").length : 0}`);
                                }
                            }
                        }

                        const eventCount = events ? events.split(",").length : 0;
                        console.error(`[search] Found ${eventCount} events in calendar "${calendar}"${errorCount > 0 ? ` (${errorCount} error(s) encountered)` : ""}`);
                    } catch (timeoutError) {
                        clearTimeout(timeoutId);
                        // If timeout or other error, skip this calendar and continue
                        // Log error to console but don't forward details to MCP users
                        console.error(`[search] Skipping calendar "${calendar}":`, timeoutError.message);
                        if (process.env.DEBUG) {
                            console.error(`[search] Debug error details:`, timeoutError);
                        }
                        continue;
                    }

                    if (events && events !== '""') {
                        const eventList = events.split(",").map((event) => event.trim());
                        for (const eventStr of eventList) {
                            if (!eventStr) continue;

                            const [title, startDateStr, endDateStr, description, location] = eventStr.split("|");
                            if (!title) continue;

                            try {
                                // Parse start date for ID generation
                                // AppleScript returns dates in format like "Monday, January 15, 2025 at 2:00:00 PM"
                                // Try to parse it, but if it fails, use a fallback
                                let startDate;
                                try {
                                    startDate = new Date(startDateStr);
                                    // Check if date is valid
                                    if (isNaN(startDate.getTime())) {
                                        // Fallback: use current date if parsing fails
                                        startDate = new Date();
                                    }
                                } catch (dateError) {
                                    // Fallback to current date if parsing fails
                                    startDate = new Date();
                                }

                                // Generate stable ID
                                const eventId = this.generateEventId(calendar, title, startDate);
                                const url = this.generateEventUrl(eventId);

                                allResults.push({
                                    id: eventId,
                                    title: title || "Untitled Event",
                                    url: url
                                });
                            } catch (itemError) {
                                // Skip individual events that fail to process
                                // Continue with next event
                                // Only log in development/debug mode to avoid noise
                                if (process.env.DEBUG) {
                                    console.error(`Error processing event in calendar ${calendar}:`, itemError);
                                }
                                continue;
                            }
                        }
                    }
                } catch (error) {
                    // Skip calendars that fail (e.g., permission issues, calendar not found)
                    // Continue searching other calendars
                    // Only log in development/debug mode to avoid noise
                    if (process.env.DEBUG) {
                        console.error(`Error searching calendar ${calendar}:`, error.message);
                    }
                    continue;
                }
            }

            // Limit total results to 50 (OpenAI's limit)
            const limitedResults = allResults.slice(0, 50);
            console.error(`[search] Search complete. Found ${allResults.length} total results (returning ${limitedResults.length} due to OpenAI limit)`);

            // Return OpenAI-compatible format (limited to 50 results)
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ results: limitedResults })
                    }
                ]
            };
        } catch (error) {
            // Log full error details to console for debugging
            console.error("[search] Fatal error:", error.message);
            if (process.env.DEBUG) {
                console.error("[search] Debug error stack:", error.stack);
            }

            // Return empty results on error (per OpenAI spec)
            // Don't expose internal error details to MCP users
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ results: [] })
                    }
                ],
                isError: true
            };
        }
    }

    // OpenAI-compatible fetch tool
    async fetch(args) {
        const { id } = args;

        if (!id) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: "Event ID is required" })
                    }
                ],
                isError: true
            };
        }

        try {
            // Parse the event ID to extract calendar, title, and date
            const parsed = this.parseEventId(id);
            if (!parsed) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: "Invalid event ID format" })
                        }
                    ],
                    isError: true
                };
            }

            // Search for the event in the specified calendar
            // We'll search by calendar and title, then match by date
            const script = `
                tell application "Calendar"
                    set theCalendar to calendar "${parsed.calendar}"
                    set allEvents to every event of theCalendar

                    repeat with anEvent in allEvents
                        set eventSummary to summary of anEvent
                        if eventSummary contains "${parsed.title}" or "${parsed.title}" is equal to eventSummary then
                            set startDate to start date of anEvent
                            set endDate to end date of anEvent
                            set eventDescription to description of anEvent
                            set eventLocation to location of anEvent

                            -- Format date for comparison
                            set startYear to year of startDate
                            set startMonth to month of startDate as integer
                            set startDay to day of startDate
                            set startHour to hours of startDate
                            set startMinute to minutes of startDate

                            set startDateStr to startYear & "-" & (startMonth as string) & "-" & (startDay as string) & " " & (startHour as string) & ":" & (startMinute as string)

                            return eventSummary & "|" & (startDate as string) & "|" & (endDate as string) & "|" & eventDescription & "|" & eventLocation & "|" & startDateStr
                        end if
                    end repeat

                    return ""
                end tell
            `;

            const result = execSync(`osascript -e '${script}'`, { encoding: "utf8" });
            const eventData = result.trim();

            if (!eventData || eventData === '""') {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: "Event not found" })
                        }
                    ],
                    isError: true
                };
            }

            // Parse event data
            const [title, startDateStr, endDateStr, description, location, dateStr] = eventData.split("|");

            // Format event text for OpenAI
            const eventText = [`Title: ${title || "Untitled Event"}`, `Calendar: ${parsed.calendar}`, `Start: ${startDateStr || "Unknown"}`, `End: ${endDateStr || "Unknown"}`, location ? `Location: ${location}` : "", description ? `Description: ${description}` : ""].filter((line) => line).join("\n");

            // Build metadata
            const metadata = {
                calendar: parsed.calendar,
                startDate: startDateStr || null,
                endDate: endDateStr || null,
                location: location || null
            };

            // Return OpenAI-compatible format
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            id: id,
                            title: title || "Untitled Event",
                            text: eventText,
                            url: this.generateEventUrl(id),
                            metadata: metadata
                        })
                    }
                ]
            };
        } catch (error) {
            // Log full error details to console for debugging
            console.error("[fetch] Error fetching event:", error.message);
            if (process.env.DEBUG) {
                console.error("[fetch] Debug error stack:", error.stack);
            }

            // Return user-friendly error without internal details
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: "Failed to fetch event" })
                    }
                ],
                isError: true
            };
        }
    }

    async run() {
        const transportMode = process.env.MCP_TRANSPORT || "stdio";

        if (transportMode === "http") {
            await this.runHTTP();
        } else {
            await this.runStdio();
        }
    }

    async runStdio() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("macOS Calendar MCP Server running on stdio");
    }

    async runHTTP() {
        const app = express();
        app.use(express.json());

        const host = process.env.MCP_HTTP_HOST || "0.0.0.0";
        const port = parseInt(process.env.MCP_HTTP_PORT || "3000", 10);

        // Map to store transports by session ID
        const transports = {};

        // MCP POST endpoint
        const mcpPostHandler = async (req, res) => {
            const sessionId = req.headers["mcp-session-id"];

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
                        jsonrpc: "2.0",
                        error: {
                            code: -32000,
                            message: "Bad Request: No valid session ID provided"
                        },
                        id: null
                    });
                    return;
                }

                // Handle the request with existing transport
                await transport.handleRequest(req, res, req.body);
            } catch (error) {
                console.error("Error handling MCP request:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: "2.0",
                        error: {
                            code: -32603,
                            message: "Internal server error"
                        },
                        id: null
                    });
                }
            }
        };

        // Handle GET requests for SSE streams
        const mcpGetHandler = async (req, res) => {
            const sessionId = req.headers["mcp-session-id"];
            if (!sessionId || !transports[sessionId]) {
                res.status(400).send("Invalid or missing session ID");
                return;
            }

            const transport = transports[sessionId];
            await transport.handleRequest(req, res);
        };

        // Handle DELETE requests for session termination
        const mcpDeleteHandler = async (req, res) => {
            const sessionId = req.headers["mcp-session-id"];
            if (!sessionId || !transports[sessionId]) {
                res.status(400).send("Invalid or missing session ID");
                return;
            }

            try {
                const transport = transports[sessionId];
                await transport.handleRequest(req, res);
            } catch (error) {
                console.error("Error handling session termination:", error);
                if (!res.headersSent) {
                    res.status(500).send("Error processing session termination");
                }
            }
        };

        // Set up routes
        app.post("/mcp", mcpPostHandler);
        app.get("/mcp", mcpGetHandler);
        app.delete("/mcp", mcpDeleteHandler);

        // Health check endpoint
        app.get("/health", (req, res) => {
            res.json({ status: "ok" });
        });

        app.listen(port, host, () => {
            console.error(`macOS Calendar MCP Server running on http://${host}:${port}/mcp`);

            // Display all available network interfaces
            const interfaces = getNetworkInterfaces(port);
            if (interfaces.length > 0) {
                console.error("\n📡 Server accessible on:");
                for (const iface of interfaces) {
                    console.error(`   ${iface.name.padEnd(12)} → ${iface.url}`);
                }
            }
        });

        // Handle server shutdown
        process.on("SIGINT", async () => {
            console.error("Shutting down server...");
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

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit - keep the server running
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Don't exit - keep the server running
});

// Run log cleanup on startup (non-blocking)
cleanupLogFiles().catch((error) => {
    // Don't let cleanup errors prevent server startup
    console.error("[startup] Log cleanup failed:", error.message);
});

const server = new MacOSCalendarServer();
server.run().catch((error) => {
    console.error("Error starting server:", error);
    // Keep process alive even if there's an error
    process.exit(1);
});
