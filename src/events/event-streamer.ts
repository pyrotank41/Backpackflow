import { EventEmitter } from 'events';

export enum StreamEventType {
    PROGRESS = 'progress',
    CHUNK = 'chunk',
    METADATA = 'metadata',
    FINAL = 'final',
    ERROR = 'error'
}

export interface StreamEvent {
    namespace: string;
    type: StreamEventType;
    content: any;
    timestamp: Date;
    nodeId?: string;
}

export class EventStreamer extends EventEmitter {
    private static instance: EventStreamer;
    
    static getInstance(): EventStreamer {
        if (!EventStreamer.instance) {
            EventStreamer.instance = new EventStreamer();
        }
        return EventStreamer.instance;
    }
    
    /**
     * Emit an event to the stream
     */
    emitEvent(namespace: string, eventType: StreamEventType, content: any, nodeId?: string): void {
        const event: StreamEvent = {
            namespace,
            type: eventType,
            content,
            timestamp: new Date(),
            nodeId
        };
        
        // Emit with namespace prefix for filtering
        this.emit(`${namespace}:${eventType}`, event);
        this.emit(`${namespace}:*`, event); // Wildcard for all events in namespace
    }
    
    /**
     * Subscribe to all events in a namespace
     */
    subscribe(namespace: string, callback: (event: StreamEvent) => void): void {
        this.on(`${namespace}:*`, callback);
    }
    
    /**
     * Subscribe to specific event types in a namespace
     */
    subscribeToType(namespace: string, eventType: StreamEventType, callback: (event: StreamEvent) => void): void {
        this.on(`${namespace}:${eventType}`, callback);
    }
    
    /**
     * Unsubscribe from a namespace
     */
    unsubscribe(namespace: string, callback?: (event: StreamEvent) => void): void {
        if (callback) {
            this.off(`${namespace}:*`, callback);
        } else {
            this.removeAllListeners(`${namespace}:*`);
        }
    }
    
    /**
     * Clear all listeners (useful for cleanup)
     */
    clearAll(): void {
        this.removeAllListeners();
    }
}
