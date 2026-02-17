/**
 * External Agent Integration Module
 *
 * Provides support for integrating external agents via various protocols:
 * - ACP (Agent Client Protocol) - Claude Code, etc.
 * - A2A (Agent-to-Agent) - Google's protocol
 * - HTTP/WebSocket - REST API agents
 *
 * @module lib/ai/agent/external
 */

export * from './acp-client';
export * from './protocol-adapter';
export * from './manager';
export * from './translators';
export * from './presets';
export * from './agent-trace-bridge';
