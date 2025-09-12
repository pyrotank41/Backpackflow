/**
 * Event Streaming System for BackpackFlow
 * 
 * Comprehensive event streaming with hierarchical naming and namespace support.
 * Events follow the pattern: {namespace}:{category}:{action}
 */

// Core event streaming
export * from './event-stream';
export * from './event-flow';

// Event types and utilities
export * from '../types/events';

// Re-export commonly used factory functions and utilities
export {
    createEventStream,
    createNamespacedStream,
    eventStreamManager,
    EventStreamManager
} from './event-stream';

export {
    createEventFlow,
    createEventBatchFlow,
    createEventParallelBatchFlow,
    enhanceFlowWithEvents
} from './event-flow';
