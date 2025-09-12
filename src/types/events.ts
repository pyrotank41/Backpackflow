/**
 * Event System Types for BackpackFlow
 * 
 * Comprehensive type definitions for the hierarchical event streaming system.
 * Events follow the pattern: {namespace}:{category}:{action}
 */

// Base event interface that all events must implement
export interface BaseEvent {
  timestamp: number;
  nodeId?: string;
}

// Event type definitions with hierarchical naming
export interface EventTypes {
  // Tool/Function call events
  'tool:call_requested': BaseEvent & { 
    toolName: string; 
    args: any; 
    nodeId: string; 
  };
  'tool:executed': BaseEvent & { 
    toolName: string; 
    args: any; 
    result: any; 
    duration: number; 
    nodeId: string; 
  };
  'tool:error': BaseEvent & { 
    toolName: string; 
    args: any; 
    error: string; 
    nodeId: string; 
  };

  // Content streaming events (for LLM responses)
  'content:stream': BaseEvent & { 
    chunk: string; 
    totalLength: number; 
    nodeId: string; 
  };
  'content:complete': BaseEvent & { 
    content: string; 
    totalLength: number; 
    duration: number; 
    nodeId: string; 
  };
  'content:start': BaseEvent & {
    nodeId: string;
    model?: string;
    expectedLength?: number;
  };

  // Node lifecycle events
  'node:start': BaseEvent & { 
    nodeType: string; 
    nodeId: string; 
    phase: 'prep' | 'exec' | 'post'; 
  };
  'node:stop': BaseEvent & { 
    nodeType: string; 
    nodeId: string; 
    phase: 'prep' | 'exec' | 'post'; 
    result?: any; 
    duration: number; 
  };
  'node:created': BaseEvent & {
    nodeType: string;
    nodeId: string;
    config?: any;
  };

  // Flow transition events
  'flow:start': BaseEvent & {
    flowId: string;
    startNode: string;
  };
  'flow:transition': BaseEvent & { 
    flowId?: string;
    fromNode: string; 
    toNode: string; 
    action: string; 
  };
  'flow:complete': BaseEvent & {
    flowId: string;
    duration: number;
    finalNode: string;
  };
  'flow:error': BaseEvent & {
    flowId?: string;
    error: string;
    currentNode?: string;
  };

  // User interaction events
  'user:input': BaseEvent & { 
    message: string; 
    sessionId?: string;
  };
  'user:interrupt': BaseEvent & { 
    reason: string; 
    nodeId?: string;
  };

  // Storage/State events
  'storage:read': BaseEvent & { 
    key: string; 
    value: any; 
    nodeId: string; 
  };
  'storage:write': BaseEvent & { 
    key: string; 
    value: any; 
    nodeId: string; 
  };
  'storage:delete': BaseEvent & {
    key: string;
    nodeId: string;
  };

  // LLM Provider events
  'llm:request': BaseEvent & {
    provider: string;
    model: string;
    messages: any[];
    config: any;
    nodeId: string;
  };
  'llm:response': BaseEvent & {
    provider: string;
    model: string;
    response: any;
    usage?: any;
    duration: number;
    nodeId: string;
  };
  'llm:error': BaseEvent & {
    provider: string;
    model: string;
    error: string;
    nodeId: string;
  };

  // System events
  'system:warning': BaseEvent & {
    message: string;
    component: string;
    severity: 'low' | 'medium' | 'high';
  };
  'system:info': BaseEvent & {
    message: string;
    component: string;
  };

  // Generic error events
  'error:node': BaseEvent & { 
    nodeId: string; 
    error: string; 
    phase: string; 
    stack?: string;
  };
  'error:flow': BaseEvent & { 
    error: string; 
    currentNode?: string; 
    stack?: string;
  };
  'error:system': BaseEvent & {
    error: string;
    component: string;
    severity: 'low' | 'medium' | 'high';
    stack?: string;
  };
}

// Event listener function type
export type EventListener<T = any> = (data: T) => void | Promise<void>;

// Event stream configuration
export interface EventStreamConfig {
  namespace?: string;
  globalEvents?: boolean;
  maxListeners?: number;
  enableDebugLogs?: boolean;
  bufferSize?: number;
  enableMetrics?: boolean;
}

// Event metrics for monitoring
export interface EventMetrics {
  totalEvents: number;
  eventsByType: Map<string, number>;
  eventsByNamespace: Map<string, number>;
  averageListeners: number;
  peakListeners: number;
  uptime: number;
  startTime: number;
}

// Event filter interface for pattern matching
export interface EventFilter {
  namespace?: string;
  category?: string;
  action?: string;
  nodeId?: string;
}

// Event subscription options
export interface SubscriptionOptions {
  once?: boolean;
  filter?: EventFilter;
  priority?: number;
  maxEvents?: number;
}

// Event stream statistics
export interface EventStreamStats {
  listenerCount: number;
  eventNames: string[];
  namespace?: string;
  metrics?: EventMetrics;
}

// Helper type for extracting event names
export type EventName = keyof EventTypes;

// Helper type for extracting event data
export type EventData<T extends EventName> = EventTypes[T];

// Utility type for namespaced event names
export type NamespacedEventName<T extends string> = `${T}:${EventName}`;

// Event handler registry type
export type EventHandlerRegistry = Map<string, Set<EventListener>>;

// Export helper types for common patterns
export type ToolEvent = EventTypes['tool:call_requested'] | EventTypes['tool:executed'] | EventTypes['tool:error'];
export type ContentEvent = EventTypes['content:stream'] | EventTypes['content:complete'] | EventTypes['content:start'];
export type NodeEvent = EventTypes['node:start'] | EventTypes['node:stop'] | EventTypes['node:created'];
export type FlowEvent = EventTypes['flow:start'] | EventTypes['flow:transition'] | EventTypes['flow:complete'] | EventTypes['flow:error'];
export type LLMEvent = EventTypes['llm:request'] | EventTypes['llm:response'] | EventTypes['llm:error'];
export type ErrorEvent = EventTypes['error:node'] | EventTypes['error:flow'] | EventTypes['error:system'];

// Constants for event categories
export const EVENT_CATEGORIES = {
  TOOL: 'tool',
  CONTENT: 'content',
  NODE: 'node',
  FLOW: 'flow',
  USER: 'user',
  STORAGE: 'storage',
  LLM: 'llm',
  SYSTEM: 'system',
  ERROR: 'error'
} as const;

// Constants for event actions
export const EVENT_ACTIONS = {
  // Tool actions
  CALL_REQUESTED: 'call_requested',
  EXECUTED: 'executed',
  ERROR: 'error',
  
  // Content actions
  STREAM: 'stream',
  COMPLETE: 'complete',
  START: 'start',
  
  // Node actions
  CREATED: 'created',
  
  // Flow actions
  TRANSITION: 'transition',
  
  // User actions
  INPUT: 'input',
  INTERRUPT: 'interrupt',
  
  // Storage actions
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  
  // LLM actions
  REQUEST: 'request',
  RESPONSE: 'response',
  
  // System actions
  WARNING: 'warning',
  INFO: 'info'
} as const;

// Type guards for event categorization
export function isToolEvent(eventName: string): boolean {
  return eventName.includes('tool:');
}

export function isContentEvent(eventName: string): boolean {
  return eventName.includes('content:');
}

export function isNodeEvent(eventName: string): boolean {
  return eventName.includes('node:');
}

export function isFlowEvent(eventName: string): boolean {
  return eventName.includes('flow:');
}

export function isErrorEvent(eventName: string): boolean {
  return eventName.includes('error:');
}

// Utility function to create event names
export function createEventName(category: string, action: string): string {
  return `${category}:${action}`;
}

// Utility function to create namespaced event names
export function createNamespacedEventName(namespace: string, category: string, action: string): string {
  return `${namespace}:${category}:${action}`;
}

// Utility function to parse event names
export function parseEventName(eventName: string): { namespace?: string; category: string; action: string } {
  const parts = eventName.split(':');
  
  if (parts.length === 2) {
    return { category: parts[0], action: parts[1] };
  } else if (parts.length === 3) {
    return { namespace: parts[0], category: parts[1], action: parts[2] };
  } else {
    throw new Error(`Invalid event name format: ${eventName}`);
  }
}
