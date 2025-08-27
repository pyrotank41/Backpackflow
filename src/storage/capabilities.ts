/**
 * Storage Capabilities System for BackpackFlow
 * 
 * This defines reusable storage capabilities that nodes can depend on,
 * enabling a library of reusable nodes while keeping storage central.
 */

// ============================================================================
// BASE STORAGE INTERFACE
// ============================================================================

/**
 * Base storage that all applications must implement
 * Provides core functionality for metadata and state tracking
 */
export interface BaseStorage {
    /** Unique identifier for this storage instance */
    id?: string;
    
    /** Timestamp when storage was created */
    createdAt?: Date;
    
    /** Last updated timestamp */
    updatedAt?: Date;
    
    /** Custom metadata that any node can read/write */
    metadata?: Record<string, any>;
    
    /** Flow execution state (internal) */
    _flowState?: {
        currentNode?: string;
        executionPath?: string[];
        errors?: Array<{ node: string; error: string; timestamp: Date }>;
    };
}

// ============================================================================
// CAPABILITY INTERFACES  
// ============================================================================

/**
 * Search Capability - for nodes that need search functionality
 */
export interface SearchCapable {
    search?: {
        /** Current or last search query */
        query?: string;
        
        /** Search results from various sources */
        results?: Array<{
            source: string;      // 'web', 'database', 'documents', etc.
            content: string;
            metadata?: Record<string, any>;
            timestamp: Date;
        }>;
        
        /** Search configuration */
        config?: {
            maxResults?: number;
            sources?: string[];
            filters?: Record<string, any>;
        };
    };
}

/**
 * Chat Capability - for conversational nodes
 */
export interface ChatCapable {
    chat?: {
        /** Current conversation messages */
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
            timestamp?: Date;
            metadata?: Record<string, any>;
        }>;
        
        /** Conversation context/summary */
        context?: string;
        
        /** Chat configuration */
        config?: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        };
    };
}

/**
 * Decision Capability - for nodes that make routing decisions
 */
export interface DecisionCapable {
    decisions?: {
        /** Current decision context */
        context?: string;
        
        /** Available actions */
        availableActions?: string[];
        
        /** Decision history */
        history?: Array<{
            decision: string;
            reasoning: string;
            timestamp: Date;
            confidence?: number;
        }>;
        
        /** Current decision */
        current?: {
            action: string;
            reasoning: string;
            confidence?: number;
        };
    };
}

/**
 * Document Capability - for document processing nodes
 */
export interface DocumentCapable {
    documents?: {
        /** Input documents */
        inputs?: Array<{
            id: string;
            content: string;
            type: string;
            metadata?: Record<string, any>;
        }>;
        
        /** Processed/output documents */
        outputs?: Array<{
            id: string;
            content: string;
            type: string;
            processingSteps?: string[];
            metadata?: Record<string, any>;
        }>;
        
        /** Processing configuration */
        config?: {
            extractionRules?: Record<string, any>;
            transformations?: string[];
        };
    };
}

/**
 * Task Capability - for task management and workflow tracking
 */
export interface TaskCapable {
    tasks?: {
        /** Current task being executed */
        current?: {
            id: string;
            name: string;
            status: 'pending' | 'in_progress' | 'completed' | 'failed';
            progress?: number;
            metadata?: Record<string, any>;
        };
        
        /** Task queue */
        queue?: Array<{
            id: string;
            name: string;
            priority: number;
            dependencies?: string[];
            metadata?: Record<string, any>;
        }>;
        
        /** Completed tasks */
        completed?: Array<{
            id: string;
            name: string;
            result?: any;
            duration?: number;
            timestamp: Date;
        }>;
    };
}

/**
 * Memory Capability - for long-term memory and context
 */
export interface MemoryCapable {
    memory?: {
        /** Short-term memory (current session) */
        shortTerm?: Record<string, any>;
        
        /** Long-term memory (persistent across sessions) */
        longTerm?: Record<string, any>;
        
        /** Semantic memory (facts, knowledge) */
        semantic?: Array<{
            key: string;
            value: any;
            confidence: number;
            sources?: string[];
            timestamp: Date;
        }>;
        
        /** Episodic memory (events, experiences) */
        episodic?: Array<{
            event: string;
            context: string;
            timestamp: Date;
            importance?: number;
        }>;
    };
}

// ============================================================================
// COMMON COMBINATIONS
// ============================================================================

/**
 * Research Storage - combines multiple capabilities for research workflows
 */
export type ResearchStorage = BaseStorage & 
    SearchCapable & 
    ChatCapable & 
    DecisionCapable & 
    MemoryCapable;

/**
 * Document Processing Storage - for document workflows
 */
export type DocumentProcessingStorage = BaseStorage & 
    DocumentCapable & 
    TaskCapable & 
    MemoryCapable;

/**
 * Simple Chat Storage - minimal chat functionality
 */
export type SimpleChatStorage = BaseStorage & ChatCapable;

/**
 * Agent Storage - full-featured agent with all capabilities
 */
export type AgentStorage = BaseStorage & 
    SearchCapable & 
    ChatCapable & 
    DecisionCapable & 
    DocumentCapable & 
    TaskCapable & 
    MemoryCapable;

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Create a new storage instance with default values
 */
export function createStorage<T extends BaseStorage>(
    type: new () => T,
    initialData?: Partial<T>
): T {
    const storage = new type();
    
    // Set base properties
    if (!storage.id) storage.id = crypto.randomUUID();
    if (!storage.createdAt) storage.createdAt = new Date();
    storage.updatedAt = new Date();
    if (!storage.metadata) storage.metadata = {};
    if (!storage._flowState) storage._flowState = {
        executionPath: []
    };
    
    // Apply initial data
    if (initialData) {
        Object.assign(storage, initialData);
    }
    
    return storage;
}

/**
 * Update storage and track the change
 */
export function updateStorage<T extends BaseStorage>(
    storage: T,
    updates: Partial<T>,
    nodeName?: string
): T {
    // Track the update
    storage.updatedAt = new Date();
    
    if (nodeName && storage._flowState) {
        if (!storage._flowState.executionPath) {
            storage._flowState.executionPath = [];
        }
        storage._flowState.executionPath.push(nodeName);
        storage._flowState.currentNode = nodeName;
    }
    
    // Apply updates
    Object.assign(storage, updates);
    
    return storage;
}

/**
 * Check if storage has a specific capability
 */
export function hasCapability<T extends BaseStorage>(
    storage: T,
    capability: keyof (SearchCapable & ChatCapable & DecisionCapable & DocumentCapable & TaskCapable & MemoryCapable)
): boolean {
    return capability in storage && (storage as any)[capability] !== undefined;
}
