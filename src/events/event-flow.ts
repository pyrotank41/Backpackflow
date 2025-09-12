/**
 * EventFlow - Enhanced Flow with comprehensive event streaming
 * 
 * Extends the base Flow class to provide:
 * - Flow lifecycle events (start/complete/error)
 * - Node transition events
 * - Enhanced error handling with events
 * - Flow statistics and monitoring
 */

import { Flow, BaseNode, BatchFlow, ParallelBatchFlow, NonIterableObject } from '../pocketflow';
import { EventStream } from './event-stream';

/**
 * Configuration for EventFlow
 */
export interface EventFlowConfig {
    flowId?: string;
    eventStream?: EventStream;
    enableTransitionEvents?: boolean;
    enableTimingEvents?: boolean;
}

/**
 * EventFlow - Flow with comprehensive event streaming
 */
export class EventFlow<S = unknown, P extends NonIterableObject = NonIterableObject> extends Flow<S, P> {
    private flowId: string;
    private eventStream?: EventStream;
    private enableTransitionEvents: boolean;
    private enableTimingEvents: boolean;
    private startTime?: number;

    constructor(startNode: BaseNode, config: EventFlowConfig = {}) {
        super(startNode);
        this.flowId = config.flowId || `flow-${Date.now()}`;
        this.eventStream = config.eventStream;
        this.enableTransitionEvents = config.enableTransitionEvents ?? true;
        this.enableTimingEvents = config.enableTimingEvents ?? true;
    }

    protected async _orchestrate(shared: S, params?: P): Promise<void> {
        this.startTime = Date.now();
        
        // Emit flow start event
        this.eventStream?.emit('flow:start', {
            flowId: this.flowId,
            startNode: this.getNodeId(this.start),
            timestamp: this.startTime
        });

        let current: BaseNode | undefined = this.start.clone();
        let previousNodeId: string | null = null;
        const mergedParams = params || this._params;

        try {
            while (current) {
                const currentNodeId = this.getNodeId(current);
                
                // Emit flow transition event
                if (this.enableTransitionEvents && previousNodeId) {
                    this.eventStream?.emit('flow:transition', {
                        flowId: this.flowId,
                        fromNode: previousNodeId,
                        toNode: currentNodeId,
                        action: 'default', // Could be enhanced to track actual action
                        timestamp: Date.now()
                    });
                }

                // Set parameters and run node
                current.setParams(mergedParams);
                
                const nodeStartTime = Date.now();
                const action = await current._run(shared);
                const nodeEndTime = Date.now();

                // Emit timing event if enabled
                if (this.enableTimingEvents) {
                    this.eventStream?.emit('node:stop', {
                        nodeType: current.constructor.name,
                        nodeId: currentNodeId,
                        phase: 'exec',
                        duration: nodeEndTime - nodeStartTime,
                        result: action,
                        timestamp: nodeEndTime
                    });
                }

                // Move to next node
                previousNodeId = currentNodeId;
                current = current.getNextNode(action);
                current = current?.clone();
            }

            // Emit flow complete event
            const duration = Date.now() - this.startTime!;
            this.eventStream?.emit('flow:complete', {
                flowId: this.flowId,
                duration,
                finalNode: previousNodeId || 'unknown',
                timestamp: Date.now()
            });

        } catch (error) {
            // Emit flow error event
            this.eventStream?.emit('flow:error', {
                flowId: this.flowId,
                error: (error as Error).message,
                currentNode: current ? this.getNodeId(current) : undefined,
                timestamp: Date.now()
            });

            // Re-throw the error
            throw error;
        }
    }

    /**
     * Enhanced run method with flow events
     */
    async run(shared: S): Promise<string | undefined> {
        try {
            return await super.run(shared);
        } catch (error) {
            // Additional error handling for flow-level errors
            this.eventStream?.emit('error:flow', {
                error: (error as Error).message,
                currentNode: this.getNodeId(this.start),
                stack: (error as Error).stack,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Set the event stream for this flow
     */
    setEventStream(eventStream: EventStream): void {
        this.eventStream = eventStream;
        
        // Propagate to all nodes if they support event streaming
        this.propagateEventStreamToNodes(this.start, eventStream);
    }

    /**
     * Get the current event stream
     */
    getEventStream(): EventStream | undefined {
        return this.eventStream;
    }

    /**
     * Get the flow ID
     */
    getFlowId(): string {
        return this.flowId;
    }

    /**
     * Enable or disable transition events
     */
    setTransitionEventsEnabled(enabled: boolean): void {
        this.enableTransitionEvents = enabled;
    }

    /**
     * Enable or disable timing events
     */
    setTimingEventsEnabled(enabled: boolean): void {
        this.enableTimingEvents = enabled;
    }

    /**
     * Get flow statistics
     */
    getFlowStats(): {
        flowId: string;
        runtime?: number;
        eventsEnabled: boolean;
        eventStream?: any;
    } {
        return {
            flowId: this.flowId,
            runtime: this.startTime ? Date.now() - this.startTime : undefined,
            eventsEnabled: !!this.eventStream,
            eventStream: this.eventStream?.getStats()
        };
    }

    // Private helper methods

    private getNodeId(node: BaseNode): string {
        // Try to get nodeId from the node if it has one
        if ('getNodeId' in node && typeof (node as any).getNodeId === 'function') {
            return (node as any).getNodeId();
        }
        
        // Try to get nodeId property
        if ('nodeId' in node) {
            return (node as any).nodeId;
        }
        
        // Fall back to constructor name with timestamp
        return `${node.constructor.name}-${Date.now()}`;
    }

    private propagateEventStreamToNodes(node: BaseNode, eventStream: EventStream): void {
        // Set event stream on the node if it supports it
        if ('setEventStream' in node && typeof (node as any).setEventStream === 'function') {
            (node as any).setEventStream(eventStream);
        }

        // Recursively propagate to successor nodes
        const successors = (node as any)._successors;
        if (successors && successors instanceof Map) {
            for (const successor of successors.values()) {
                this.propagateEventStreamToNodes(successor, eventStream);
            }
        }
    }
}

/**
 * EventBatchFlow - Batch Flow with event streaming
 */
export class EventBatchFlow<
    S = unknown, 
    P extends NonIterableObject = NonIterableObject, 
    NP extends NonIterableObject[] = NonIterableObject[]
> extends BatchFlow<S, P, NP> {
    private flowId: string;
    private eventStream?: EventStream;

    constructor(startNode: BaseNode, config: EventFlowConfig = {}) {
        super(startNode);
        this.flowId = config.flowId || `batch-flow-${Date.now()}`;
        this.eventStream = config.eventStream;
    }

    async _run(shared: S): Promise<string | undefined> {
        const startTime = Date.now();
        
        // Emit flow start event
        this.eventStream?.emit('flow:start', {
            flowId: this.flowId,
            startNode: this.getNodeId(this.start),
            timestamp: startTime
        });

        try {
            const result = await super._run(shared);
            
            // Emit flow complete event
            const duration = Date.now() - startTime;
            this.eventStream?.emit('flow:complete', {
                flowId: this.flowId,
                duration,
                finalNode: this.getNodeId(this.start),
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            // Emit flow error event
            this.eventStream?.emit('flow:error', {
                flowId: this.flowId,
                error: (error as Error).message,
                currentNode: this.getNodeId(this.start),
                timestamp: Date.now()
            });
            throw error;
        }
    }

    setEventStream(eventStream: EventStream): void {
        this.eventStream = eventStream;
    }

    getEventStream(): EventStream | undefined {
        return this.eventStream;
    }

    getFlowId(): string {
        return this.flowId;
    }

    private getNodeId(node: BaseNode): string {
        if ('getNodeId' in node && typeof (node as any).getNodeId === 'function') {
            return (node as any).getNodeId();
        }
        if ('nodeId' in node) {
            return (node as any).nodeId;
        }
        return `${node.constructor.name}-${Date.now()}`;
    }
}

/**
 * EventParallelBatchFlow - Parallel Batch Flow with event streaming
 */
export class EventParallelBatchFlow<
    S = unknown, 
    P extends NonIterableObject = NonIterableObject, 
    NP extends NonIterableObject[] = NonIterableObject[]
> extends ParallelBatchFlow<S, P, NP> {
    private flowId: string;
    private eventStream?: EventStream;

    constructor(startNode: BaseNode, config: EventFlowConfig = {}) {
        super(startNode);
        this.flowId = config.flowId || `parallel-batch-flow-${Date.now()}`;
        this.eventStream = config.eventStream;
    }

    async _run(shared: S): Promise<string | undefined> {
        const startTime = Date.now();
        
        // Emit flow start event
        this.eventStream?.emit('flow:start', {
            flowId: this.flowId,
            startNode: this.getNodeId(this.start),
            timestamp: startTime
        });

        try {
            const result = await super._run(shared);
            
            // Emit flow complete event
            const duration = Date.now() - startTime;
            this.eventStream?.emit('flow:complete', {
                flowId: this.flowId,
                duration,
                finalNode: this.getNodeId(this.start),
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            // Emit flow error event
            this.eventStream?.emit('flow:error', {
                flowId: this.flowId,
                error: (error as Error).message,
                currentNode: this.getNodeId(this.start),
                timestamp: Date.now()
            });
            throw error;
        }
    }

    setEventStream(eventStream: EventStream): void {
        this.eventStream = eventStream;
    }

    getEventStream(): EventStream | undefined {
        return this.eventStream;
    }

    getFlowId(): string {
        return this.flowId;
    }

    private getNodeId(node: BaseNode): string {
        if ('getNodeId' in node && typeof (node as any).getNodeId === 'function') {
            return (node as any).getNodeId();
        }
        if ('nodeId' in node) {
            return (node as any).nodeId;
        }
        return `${node.constructor.name}-${Date.now()}`;
    }
}

/**
 * Factory functions for creating event-enabled flows
 */

/**
 * Create an EventFlow with the specified configuration
 */
export function createEventFlow<S = unknown, P extends NonIterableObject = NonIterableObject>(
    startNode: BaseNode,
    config?: EventFlowConfig
): EventFlow<S, P> {
    return new EventFlow<S, P>(startNode, config);
}

/**
 * Create an EventBatchFlow with the specified configuration
 */
export function createEventBatchFlow<
    S = unknown, 
    P extends NonIterableObject = NonIterableObject, 
    NP extends NonIterableObject[] = NonIterableObject[]
>(
    startNode: BaseNode,
    config?: EventFlowConfig
): EventBatchFlow<S, P, NP> {
    return new EventBatchFlow<S, P, NP>(startNode, config);
}

/**
 * Create an EventParallelBatchFlow with the specified configuration
 */
export function createEventParallelBatchFlow<
    S = unknown, 
    P extends NonIterableObject = NonIterableObject, 
    NP extends NonIterableObject[] = NonIterableObject[]
>(
    startNode: BaseNode,
    config?: EventFlowConfig
): EventParallelBatchFlow<S, P, NP> {
    return new EventParallelBatchFlow<S, P, NP>(startNode, config);
}

/**
 * Utility function to convert a regular Flow to an EventFlow
 */
export function enhanceFlowWithEvents<S = unknown, P extends NonIterableObject = NonIterableObject>(
    flow: Flow<S, P>,
    eventStream: EventStream,
    flowId?: string
): EventFlow<S, P> {
    const eventFlow = new EventFlow<S, P>(flow.start, {
        flowId,
        eventStream,
        enableTransitionEvents: true,
        enableTimingEvents: true
    });
    
    // Copy any parameters from the original flow
    // Note: _params is protected, so we use a type assertion for this utility function
    (eventFlow as any)._params = (flow as any)._params;
    
    return eventFlow;
}
