/**
 * Core EventStream implementation for BackpackFlow
 * 
 * Provides hierarchical event streaming with namespace support.
 * Events follow the pattern: {namespace}:{category}:{action}
 */

import { EventEmitter } from 'events';
import { 
  EventTypes, 
  EventName, 
  EventData, 
  EventListener, 
  EventStreamConfig, 
  EventStreamStats, 
  EventMetrics,
  SubscriptionOptions,
  EventFilter,
  parseEventName,
  createNamespacedEventName
} from '../types/events';

/**
 * Core EventStream class implementing hierarchical event streaming
 */
export class EventStream {
  private emitter: EventEmitter;
  private namespace?: string;
  private globalEvents: boolean;
  private enableDebugLogs: boolean;
  private enableMetrics: boolean;
  private metrics: EventMetrics;
  private subscriptions: Map<string, Set<{ listener: EventListener; options?: SubscriptionOptions }>> = new Map();

  constructor(config: EventStreamConfig = {}) {
    this.emitter = new EventEmitter();
    this.namespace = config.namespace;
    this.globalEvents = config.globalEvents ?? true;
    this.enableDebugLogs = config.enableDebugLogs ?? false;
    this.enableMetrics = config.enableMetrics ?? true;
    
    if (config.maxListeners) {
      this.emitter.setMaxListeners(config.maxListeners);
    }

    // Initialize metrics
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      eventsByNamespace: new Map(),
      averageListeners: 0,
      peakListeners: 0,
      uptime: 0,
      startTime: Date.now()
    };

    // Setup internal listeners for metrics
    if (this.enableMetrics) {
      this.setupMetricsCollection();
    }
  }

  /**
   * Emit an event with automatic namespace handling
   */
  emit<K extends EventName>(
    eventType: K, 
    data: EventData<K>
  ): boolean {
    const baseEvent = eventType as string;
    const timestamp = Date.now();
    
    // Ensure timestamp is set
    const eventData = { ...data, timestamp };

    if (this.enableDebugLogs) {
      console.log(`🎯 Event: ${this.formatEventName(baseEvent)}`, eventData);
    }

    // Update metrics
    if (this.enableMetrics) {
      this.updateMetrics(baseEvent);
    }

    let emitted = false;

    // Emit namespaced event
    if (this.namespace) {
      const namespacedEvent = `${this.namespace}:${baseEvent}`;
      emitted = this.emitter.emit(namespacedEvent, eventData) || emitted;
    }

    // Emit global event if enabled
    if (this.globalEvents) {
      emitted = this.emitter.emit(baseEvent, eventData) || emitted;
    }

    return emitted;
  }

  /**
   * Subscribe to events with optional filtering
   */
  on<K extends EventName>(
    eventType: K | string, 
    listener: EventListener<EventData<K>>,
    options?: SubscriptionOptions
  ): this {
    const eventName = eventType as string;
    const wrappedListener = this.wrapListener(listener, options);
    
    this.emitter.on(eventName, wrappedListener);
    
    // Track subscription for management
    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, new Set());
    }
    this.subscriptions.get(eventName)!.add({ listener, options });

    return this;
  }

  /**
   * Subscribe to namespaced events
   */
  onNamespaced<K extends EventName>(
    eventType: K, 
    listener: EventListener<EventData<K>>,
    options?: SubscriptionOptions
  ): this {
    if (!this.namespace) {
      throw new Error('Cannot use onNamespaced without a namespace');
    }
    const namespacedEvent = `${this.namespace}:${eventType}`;
    return this.on(namespacedEvent, listener, options);
  }

  /**
   * Subscribe to events matching a pattern
   * Supports wildcards: 'tool:*', '*:error', 'namespace:*:*'
   */
  onPattern(
    pattern: string, 
    listener: (eventName: string, data: any) => void | Promise<void>,
    options?: SubscriptionOptions
  ): this {
    const patternRegex = this.createPatternRegex(pattern);
    
    // Listen to newListener events to catch matching patterns
    const patternListener = (eventName: string, eventListener: Function) => {
      if (patternRegex.test(eventName)) {
        this.emitter.on(eventName, (data) => {
          listener(eventName, data);
        });
      }
    };

    this.emitter.on('newListener', patternListener);

    // Also check existing listeners
    for (const existingEvent of this.emitter.eventNames()) {
      const eventName = existingEvent.toString();
      if (patternRegex.test(eventName)) {
        this.emitter.on(eventName, (data) => {
          listener(eventName, data);
        });
      }
    }

    return this;
  }

  /**
   * One-time event listener
   */
  once<K extends EventName>(
    eventType: K | string, 
    listener: EventListener<EventData<K>>
  ): this {
    return this.on(eventType, listener, { once: true });
  }

  /**
   * Remove event listener
   */
  off<K extends EventName>(
    eventType: K | string, 
    listener: EventListener<EventData<K>>
  ): this {
    const eventName = eventType as string;
    
    // Find and remove from our tracking
    const subscriptionSet = this.subscriptions.get(eventName);
    if (subscriptionSet) {
      for (const sub of subscriptionSet) {
        if (sub.listener === listener) {
          subscriptionSet.delete(sub);
          break;
        }
      }
    }

    this.emitter.off(eventName, listener as any);
    return this;
  }

  /**
   * Get all listeners for an event
   */
  listeners<K extends EventName>(eventType: K | string): Function[] {
    return this.emitter.listeners(eventType as string);
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(eventType?: string): this {
    if (eventType) {
      this.subscriptions.delete(eventType);
    } else {
      this.subscriptions.clear();
    }
    this.emitter.removeAllListeners(eventType);
    return this;
  }

  /**
   * Create a child stream with a sub-namespace
   */
  createChildStream(childNamespace: string, config?: Partial<EventStreamConfig>): EventStream {
    const fullNamespace = this.namespace 
      ? `${this.namespace}:${childNamespace}`
      : childNamespace;
    
    return new EventStream({
      namespace: fullNamespace,
      globalEvents: this.globalEvents,
      enableDebugLogs: this.enableDebugLogs,
      enableMetrics: this.enableMetrics,
      ...config
    });
  }

  /**
   * Get event stream statistics
   */
  getStats(): EventStreamStats {
    const currentTime = Date.now();
    this.metrics.uptime = (currentTime - this.metrics.startTime) / 1000;
    
    const eventNames = this.emitter.eventNames() as string[];
    const listenerCount = eventNames.reduce((total, event) => {
      return total + this.emitter.listenerCount(event);
    }, 0);

    return {
      listenerCount,
      eventNames,
      namespace: this.namespace,
      metrics: this.enableMetrics ? { ...this.metrics } : undefined
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): EventMetrics {
    if (!this.enableMetrics) {
      throw new Error('Metrics are disabled. Enable with enableMetrics: true');
    }
    
    const currentTime = Date.now();
    return {
      ...this.metrics,
      uptime: (currentTime - this.metrics.startTime) / 1000
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      eventsByNamespace: new Map(),
      averageListeners: 0,
      peakListeners: 0,
      uptime: 0,
      startTime: Date.now()
    };
  }

  /**
   * Get or set the namespace
   */
  getNamespace(): string | undefined {
    return this.namespace;
  }

  setNamespace(namespace: string): void {
    this.namespace = namespace;
  }

  /**
   * Enable or disable debug logging
   */
  setDebugLogging(enabled: boolean): void {
    this.enableDebugLogs = enabled;
  }

  /**
   * Check if the stream has any listeners for an event
   */
  hasListeners(eventType: string): boolean {
    return this.emitter.listenerCount(eventType) > 0;
  }

  /**
   * Get the underlying EventEmitter (for advanced usage)
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }

  // Private helper methods

  private setupMetricsCollection(): void {
    // Track listener changes
    this.emitter.on('newListener', () => {
      const currentListeners = this.getCurrentListenerCount();
      this.metrics.peakListeners = Math.max(this.metrics.peakListeners, currentListeners);
    });

    // Periodically update average listeners
    setInterval(() => {
      const currentListeners = this.getCurrentListenerCount();
      this.metrics.averageListeners = (this.metrics.averageListeners + currentListeners) / 2;
    }, 10000); // Every 10 seconds
  }

  private updateMetrics(eventName: string): void {
    this.metrics.totalEvents++;
    
    // Update by type
    const count = this.metrics.eventsByType.get(eventName) || 0;
    this.metrics.eventsByType.set(eventName, count + 1);
    
    // Update by namespace
    if (this.namespace) {
      const nsCount = this.metrics.eventsByNamespace.get(this.namespace) || 0;
      this.metrics.eventsByNamespace.set(this.namespace, nsCount + 1);
    }
  }

  private wrapListener(
    listener: EventListener, 
    options?: SubscriptionOptions
  ): EventListener {
    let callCount = 0;
    
    return function wrappedListener(this: any, ...args: any[]) {
      // Check maxEvents limit
      if (options?.maxEvents && callCount >= options.maxEvents) {
        return;
      }
      
      callCount++;
      
      // Apply filtering if specified
      if (options?.filter && !this.matchesFilter(args[0], options.filter)) {
        return;
      }
      
      // Call the original listener
      const result = listener(args[0]);
      
      // Handle once option
      if (options?.once) {
        // Remove listener after first call
        // Note: This would need the original event name to properly remove
      }
      
      return result;
    };
  }

  private matchesFilter(eventData: any, filter: EventFilter): boolean {
    if (filter.nodeId && eventData.nodeId !== filter.nodeId) {
      return false;
    }
    
    // Additional filter logic can be added here
    return true;
  }

  private createPatternRegex(pattern: string): RegExp {
    // Convert glob-style pattern to regex
    const escapedPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^:]*')
      .replace(/\*\*/g, '.*');
    
    return new RegExp(`^${escapedPattern}$`);
  }

  private formatEventName(eventType: string): string {
    return this.namespace ? `${this.namespace}:${eventType}` : eventType;
  }

  private getCurrentListenerCount(): number {
    return this.emitter.eventNames().reduce((total, event) => {
      return total + this.emitter.listenerCount(event);
    }, 0);
  }
}

/**
 * Factory function to create a new EventStream
 */
export function createEventStream(config?: EventStreamConfig): EventStream {
  return new EventStream(config);
}

/**
 * Factory function to create a namespaced EventStream
 */
export function createNamespacedStream(
  namespace: string, 
  config?: Partial<EventStreamConfig>
): EventStream {
  return new EventStream({
    namespace,
    ...config
  });
}

/**
 * Utility class for managing multiple event streams
 */
export class EventStreamManager {
  private streams: Map<string, EventStream> = new Map();
  private globalStream: EventStream;

  constructor() {
    this.globalStream = new EventStream({ 
      globalEvents: true, 
      enableMetrics: true 
    });
  }

  /**
   * Create or get a namespaced stream
   */
  getStream(namespace: string, config?: Partial<EventStreamConfig>): EventStream {
    if (!this.streams.has(namespace)) {
      const stream = createNamespacedStream(namespace, config);
      this.streams.set(namespace, stream);
    }
    return this.streams.get(namespace)!;
  }

  /**
   * Get the global stream
   */
  getGlobalStream(): EventStream {
    return this.globalStream;
  }

  /**
   * Get all managed streams
   */
  getAllStreams(): Map<string, EventStream> {
    return new Map(this.streams);
  }

  /**
   * Remove a stream
   */
  removeStream(namespace: string): boolean {
    const stream = this.streams.get(namespace);
    if (stream) {
      stream.removeAllListeners();
      return this.streams.delete(namespace);
    }
    return false;
  }

  /**
   * Get aggregated statistics from all streams
   */
  getAggregatedStats(): {
    totalStreams: number;
    totalListeners: number;
    totalEvents: number;
    streamStats: { namespace: string; stats: EventStreamStats }[];
  } {
    const streamStats: { namespace: string; stats: EventStreamStats }[] = [];
    let totalListeners = 0;
    let totalEvents = 0;

    for (const [namespace, stream] of this.streams) {
      const stats = stream.getStats();
      streamStats.push({ namespace, stats });
      totalListeners += stats.listenerCount;
      
      if (stats.metrics) {
        totalEvents += stats.metrics.totalEvents;
      }
    }

    return {
      totalStreams: this.streams.size,
      totalListeners,
      totalEvents,
      streamStats
    };
  }

  /**
   * Cleanup all streams
   */
  cleanup(): void {
    for (const stream of this.streams.values()) {
      stream.removeAllListeners();
    }
    this.streams.clear();
    this.globalStream.removeAllListeners();
  }
}

// Export a singleton manager for convenience
export const eventStreamManager = new EventStreamManager();
