/**
 * ReAct Functionality - Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import { buildReActSystemPrompt, parseReActResponse, type ReActFormat } from './agent-executor';

describe('ReAct Functionality', () => {
  describe('buildReActSystemPrompt', () => {
    it('should return empty string for disabled format', () => {
      const prompt = buildReActSystemPrompt('disabled');
      expect(prompt).toBe('');
    });

    it('should build standard ReAct prompt', () => {
      const prompt = buildReActSystemPrompt('standard');

      expect(prompt).toContain('You are a reasoning agent');
      expect(prompt).toContain('Thought:');
      expect(prompt).toContain('Action:');
      expect(prompt).toContain('web_search(query="X")');
    });

    it('should build detailed ReAct prompt', () => {
      const prompt = buildReActSystemPrompt('detailed');

      expect(prompt).toContain('You are a reasoning agent');
      expect(prompt).toContain('Thought:');
      expect(prompt).toContain('Action:');
      expect(prompt).toContain('Observation:');
      expect(prompt).toContain('will be filled automatically');
    });

    it('should build minimal ReAct prompt', () => {
      const prompt = buildReActSystemPrompt('minimal');

      expect(prompt).toContain('You are a reasoning agent');
      expect(prompt).toContain('Think step-by-step');
      expect(prompt).not.toContain('Thought:');
      expect(prompt).not.toContain('Action:');
    });
  });

  describe('parseReActResponse', () => {
    it('should return empty object for disabled format', () => {
      const response = 'Some response';
      const parsed = parseReActResponse(response, 'disabled');

      expect(parsed).toEqual({
        thought: undefined,
        actionDescription: undefined,
        observation: undefined,
      });
    });

    it('should return empty object for minimal format', () => {
      const response = 'Some response';
      const parsed = parseReActResponse(response, 'minimal');

      expect(parsed).toEqual({
        thought: undefined,
        actionDescription: undefined,
        observation: undefined,
      });
    });

    it('should parse standard ReAct response', () => {
      const response = `Thought: I need to search for information about X
Action: web_search(query="X")`;

      const parsed = parseReActResponse(response, 'standard');

      expect(parsed.thought).toBe('I need to search for information about X');
      expect(parsed.actionDescription).toBe('web_search(query="X")');
      expect(parsed.observation).toBeUndefined();
    });

    it('should parse detailed ReAct response', () => {
      const response = `Thought: The user is asking about X. I should search for current information.
Action: web_search(query="X", max_results=5)
Observation: [search results will appear here]
Thought: Based on the results, I now have enough information to answer.
Action: finish`;

      const parsed = parseReActResponse(response, 'detailed');

      expect(parsed.thought).toContain('The user is asking about X');
      expect(parsed.actionDescription).toContain('web_search');
      expect(parsed.observation).toContain('[search results will appear here]');
    });

    it('should handle multi-line thoughts', () => {
      const response = `Thought: I need to search for information about X.
This is important because the user needs accurate data.
Action: web_search(query="X")`;

      const parsed = parseReActResponse(response, 'standard');

      expect(parsed.thought).toContain('I need to search for information about X');
      expect(parsed.thought).toContain('This is important because');
    });

    it('should handle responses with extra whitespace', () => {
      const response = `Thought:   I need to search  
  for information about X
Action: web_search(query="X")`;

      const parsed = parseReActResponse(response, 'standard');

      expect(parsed.thought?.trim()).toBe('I need to search\n  for information about X');
      expect(parsed.actionDescription?.trim()).toBe('web_search(query="X")');
    });

    it('should handle responses without Thought', () => {
      const response = `Action: web_search(query="X")`;

      const parsed = parseReActResponse(response, 'standard');

      expect(parsed.thought).toBeUndefined();
      expect(parsed.actionDescription).toBe('web_search(query="X")');
    });

    it('should handle responses without Action', () => {
      const response = `Thought: I need to search for information about X`;

      const parsed = parseReActResponse(response, 'standard');

      expect(parsed.thought).toBe('I need to search for information about X');
      expect(parsed.actionDescription).toBeUndefined();
    });

    it('should handle empty response', () => {
      const response = '';
      const parsed = parseReActResponse(response, 'standard');

      expect(parsed).toEqual({
        thought: undefined,
        actionDescription: undefined,
        observation: undefined,
      });
    });

    it('should handle response with only text', () => {
      const response = 'This is just a regular response without ReAct format';
      const parsed = parseReActResponse(response, 'standard');

      expect(parsed).toEqual({
        thought: undefined,
        actionDescription: undefined,
        observation: undefined,
      });
    });

    it('should handle case-insensitive parsing', () => {
      const response = `thought: I need to search for information
action: web_search(query="X")`;

      const parsed = parseReActResponse(response, 'standard');

      expect(parsed.thought).toBe('I need to search for information');
      expect(parsed.actionDescription).toBe('web_search(query="X")');
    });
  });

  describe('Integration Tests', () => {
    it('should build and parse complete ReAct cycle', () => {
      const format: ReActFormat = 'standard';
      const prompt = buildReActSystemPrompt(format);

      expect(prompt).toBeTruthy();

      const response = `Thought: I need to find information about AI
Action: web_search(query="AI", max_results=5)`;

      const parsed = parseReActResponse(response, format);

      expect(parsed.thought).toBe('I need to find information about AI');
      expect(parsed.actionDescription).toBe('web_search(query="AI", max_results=5)');
    });

    it('should handle detailed ReAct with observation', () => {
      const format: ReActFormat = 'detailed';
      const prompt = buildReActSystemPrompt(format);

      expect(prompt).toContain('Observation:');

      const response = `Thought: I need to find information about AI
Action: web_search(query="AI", max_results=5)
Observation: Found 5 results about AI
Thought: I have enough information now
Action: finish`;

      const parsed = parseReActResponse(response, format);

      expect(parsed.thought).toContain('I need to find information about AI');
      expect(parsed.actionDescription).toContain('web_search');
      expect(parsed.observation).toContain('Found 5 results');
    });
  });
});
