/**
 * Event Streaming Example
 * 
 * This example demonstrates the event streaming capabilities of BackpackFlow:
 * - Real-time event streaming with namespaces
 * - Event-driven node communication
 * - Structured event types for different use cases
 */

import { 
    EventStreamer,
    StreamEventType,
    AgentNode,
    DecisionNode,
    createInstructorClient
} from '../index';

/**
 * Basic example showing how to use EventStreamer
 */
async function basicEventStreamingExample() {
    console.log('🎛️ Basic Event Streaming Example\n');
    
    // Get EventStreamer instance
    const eventStreamer = EventStreamer.getInstance();
    
    // Subscribe to events in the 'demo' namespace
    eventStreamer.subscribe('demo', (event) => {
        console.log(`[${event.type.toUpperCase()}] ${event.nodeId}: ${JSON.stringify(event.content)}`);
    });
    
    // Create LLM client (explicitly specify provider)
    const instructorClient = createInstructorClient({ provider: 'openai' });
    
    // Create a simple decision node with event streaming
    const decisionNode = new DecisionNode({
        instructorClient,
        eventStreamer,
        namespace: 'demo',
        systemPrompt: 'You are a helpful assistant that makes decisions.'
    });
    
    // Simulate some events
    console.log('📡 Emitting sample events...\n');
    
    eventStreamer.emitEvent('demo', StreamEventType.PROGRESS, { 
        status: 'starting_demo',
        message: 'Beginning event streaming demonstration'
    }, 'DemoNode');
    
    eventStreamer.emitEvent('demo', StreamEventType.METADATA, { 
        demo_info: 'This is a metadata event',
        timestamp: new Date().toISOString()
    }, 'DemoNode');
    
    eventStreamer.emitEvent('demo', StreamEventType.FINAL, { 
        status: 'demo_complete',
        message: 'Event streaming demonstration completed successfully'
    }, 'DemoNode');
    
    console.log('\n✅ Basic event streaming example completed!\n');
    
    // Clean up
    eventStreamer.clearAll();
}

/**
 * Advanced example with multiple namespaces
 */
async function multiNamespaceExample() {
    console.log('🎛️ Multi-Namespace Event Streaming Example\n');
    
    const eventStreamer = EventStreamer.getInstance();
    
    // Subscribe to different namespaces
    eventStreamer.subscribe('agent_1', (event) => {
        console.log(`[AGENT-1] ${event.type}: ${JSON.stringify(event.content)}`);
    });
    
    eventStreamer.subscribe('agent_2', (event) => {
        console.log(`[AGENT-2] ${event.type}: ${JSON.stringify(event.content)}`);
    });
    
    // Simulate events from different agents
    eventStreamer.emitEvent('agent_1', StreamEventType.PROGRESS, { 
        task: 'processing_request_a' 
    }, 'Agent1');
    
    eventStreamer.emitEvent('agent_2', StreamEventType.PROGRESS, { 
        task: 'processing_request_b' 
    }, 'Agent2');
    
    eventStreamer.emitEvent('agent_1', StreamEventType.FINAL, { 
        result: 'Request A completed' 
    }, 'Agent1');
    
    eventStreamer.emitEvent('agent_2', StreamEventType.FINAL, { 
        result: 'Request B completed' 
    }, 'Agent2');
    
    console.log('\n✅ Multi-namespace example completed!\n');
    
    // Clean up
    eventStreamer.clearAll();
}

/**
 * Run all examples
 */
async function runExamples() {
    try {
        await basicEventStreamingExample();
        await multiNamespaceExample();
        
        console.log('🎉 All event streaming examples completed successfully!');
    } catch (error) {
        console.error('❌ Error running examples:', error);
    }
}

// Export for use in other modules
export { runExamples as runEventStreamingExamples };

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples();
}