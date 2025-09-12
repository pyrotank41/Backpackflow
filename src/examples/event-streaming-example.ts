/**
 * Event Streaming Example
 * 
 * This example demonstrates the core event streaming capabilities of BackpackFlow:
 * - Hierarchical event naming with namespaces
 * - Real-time LLM content streaming
 * - Node lifecycle monitoring
 * - Flow transition tracking
 * - Multi-agent namespace isolation
 */

import { 
    createNamespacedStream, 
    EventChatNode, 
    createEventChatNodeWithOpenAI,
    EventFlow,
    createEventFlow,
    OpenAIProvider,
    ChatNodeStorage 
} from '../index';

/**
 * Simple storage interface for the example
 */
interface ExampleStorage extends ChatNodeStorage {
    sessionId: string;
    userId?: string;
}

/**
 * Basic event streaming example
 */
export async function basicEventStreamingExample() {
    console.log('🌊 Basic Event Streaming Example');
    console.log('===============================\n');

    // Create a namespaced event stream
    const chatStream = createNamespacedStream('example-chat', {
        enableDebugLogs: false,
        enableMetrics: true
    });

    // Set up event listeners for demonstration
    chatStream.onNamespaced('content:stream', (data) => {
        process.stdout.write(data.chunk); // Real-time output
    });

    chatStream.onNamespaced('content:complete', (data) => {
        console.log(`\n✅ Response complete: ${data.totalLength} characters in ${data.duration}ms\n`);
    });

    chatStream.onNamespaced('node:start', (data) => {
        console.log(`🚀 ${data.nodeType}.${data.phase} started`);
    });

    chatStream.onNamespaced('node:stop', (data) => {
        console.log(`🏁 ${data.nodeType}.${data.phase} completed (${data.duration}ms)`);
    });

    chatStream.onNamespaced('user:input', (data) => {
        console.log(`👤 User: ${data.message}`);
    });

    chatStream.onNamespaced('storage:write', (data) => {
        console.log(`💾 Storage write: ${data.key}`);
    });

    // Create an event-enabled chat node
    const apiKey = process.env.OPENAI_API_KEY || 'demo-key';
    const chatNode = createEventChatNodeWithOpenAI(apiKey, chatStream, {
        systemMessage: 'You are a helpful assistant. Keep responses concise.',
        nodeId: 'example-chat-node',
        enableStreaming: true
    });

    // Create storage
    const storage: ExampleStorage = {
        sessionId: `session-${Date.now()}`
    };

    // Have a conversation with event streaming
    console.log('Starting conversation...\n');
    await chatNode.sendMessage(storage, 'Hello! Can you explain what event streaming is in one sentence?');
    await chatNode.sendMessage(storage, 'How would I use it in a TypeScript application?');

    // Display statistics
    console.log('\n📊 Event Stream Statistics:');
    const stats = chatStream.getStats();
    console.log(`- Total listeners: ${stats.listenerCount}`);
    console.log(`- Event types: ${stats.eventNames.length}`);
    console.log(`- Namespace: ${stats.namespace}`);
    
    if (stats.metrics) {
        console.log(`- Total events: ${stats.metrics.totalEvents}`);
        console.log(`- Event types fired:`);
        for (const [event, count] of stats.metrics.eventsByType.entries()) {
            console.log(`  - ${event}: ${count}`);
        }
    }

    console.log('\n✅ Basic example complete!\n');
}

/**
 * Multi-agent example with namespace isolation
 */
export async function multiAgentEventStreamingExample() {
    console.log('🤖 Multi-Agent Event Streaming Example');
    console.log('=====================================\n');

    const apiKey = process.env.OPENAI_API_KEY || 'demo-key';

    // Create separate streams for different agents
    const assistantStream = createNamespacedStream('assistant', { enableMetrics: true });
    const analyzerStream = createNamespacedStream('analyzer', { enableMetrics: true });

    // Set up different event listeners for each agent
    assistantStream.onNamespaced('content:stream', (data) => {
        process.stdout.write(data.chunk);
    });

    assistantStream.onNamespaced('content:complete', (data) => {
        console.log(`\n✅ [Assistant] Complete: ${data.totalLength} chars in ${data.duration}ms\n`);
    });

    analyzerStream.onNamespaced('content:stream', (data) => {
        process.stdout.write(data.chunk);
    });

    analyzerStream.onNamespaced('content:complete', (data) => {
        console.log(`\n✅ [Analyzer] Complete: ${data.totalLength} chars in ${data.duration}ms\n`);
    });

    // Create agents with different personalities
    const assistant = createEventChatNodeWithOpenAI(apiKey, assistantStream, {
        systemMessage: 'You are a friendly assistant that helps with general questions.',
        nodeId: 'assistant-agent',
        model: 'gpt-4o-mini'
    });

    const analyzer = createEventChatNodeWithOpenAI(apiKey, analyzerStream, {
        systemMessage: 'You are a technical analyzer that provides detailed explanations.',
        nodeId: 'analyzer-agent',
        model: 'gpt-4o-mini'
    });

    // Create separate storage for each agent
    const assistantStorage: ExampleStorage = { sessionId: 'assistant-session' };
    const analyzerStorage: ExampleStorage = { sessionId: 'analyzer-session' };

    // Run agents with different questions
    console.log('🤖 Assistant: ');
    await assistant.sendMessage(assistantStorage, "What's a good breakfast recipe?");
    
    console.log('🔬 Analyzer: ');
    await analyzer.sendMessage(analyzerStorage, 'Explain how async/await works in JavaScript');

    // Show statistics for each agent
    console.log('\n📊 Agent Statistics:');
    const assistantStats = assistantStream.getStats();
    const analyzerStats = analyzerStream.getStats();

    console.log(`\n🤖 Assistant (${assistantStats.namespace}):`);
    console.log(`   - Events fired: ${assistantStats.metrics?.totalEvents || 0}`);
    console.log(`   - Listeners: ${assistantStats.listenerCount}`);

    console.log(`\n🔬 Analyzer (${analyzerStats.namespace}):`);
    console.log(`   - Events fired: ${analyzerStats.metrics?.totalEvents || 0}`);
    console.log(`   - Listeners: ${analyzerStats.listenerCount}`);

    console.log('\n✅ Multi-agent example complete!\n');
}

/**
 * Flow-based example with transition events
 */
export async function flowEventStreamingExample() {
    console.log('🔄 Flow Event Streaming Example');
    console.log('==============================\n');

    const apiKey = process.env.OPENAI_API_KEY || 'demo-key';
    const flowStream = createNamespacedStream('conversation-flow');

    // Listen to flow events
    flowStream.onNamespaced('flow:start', (data) => {
        console.log(`🚀 Flow started: ${data.flowId} from ${data.startNode}`);
    });

    flowStream.onNamespaced('flow:transition', (data) => {
        console.log(`🔄 Flow transition: ${data.fromNode} → ${data.toNode}`);
    });

    flowStream.onNamespaced('flow:complete', (data) => {
        console.log(`✅ Flow complete: ${data.flowId} in ${data.duration}ms`);
    });

    // Create event-enabled nodes
    const greetingNode = createEventChatNodeWithOpenAI(apiKey, flowStream, {
        systemMessage: 'You are a friendly greeter. Say hello and ask how you can help.',
        nodeId: 'greeting-node'
    });

    const helpNode = createEventChatNodeWithOpenAI(apiKey, flowStream, {
        systemMessage: 'You are a helpful assistant. Provide assistance based on the user\'s needs.',
        nodeId: 'help-node'
    });

    // Set up a simple flow: greeting → help
    greetingNode.next(helpNode);

    // Create event-enabled flow
    const conversationFlow = createEventFlow(greetingNode, {
        flowId: 'conversation-flow',
        eventStream: flowStream,
        enableTransitionEvents: true,
        enableTimingEvents: true
    });

    // Create storage and run the flow
    const storage: ExampleStorage = {
        sessionId: 'flow-session'
    };

    // Add initial user message
    await greetingNode.prep(storage, 'Hello, I need help with TypeScript');

    // Run the flow
    console.log('Running conversation flow...\n');
    await conversationFlow.run(storage);

    console.log('\n✅ Flow example complete!\n');
}

/**
 * Global monitoring example
 */
export async function globalMonitoringExample() {
    console.log('🌐 Global Event Monitoring Example');
    console.log('=================================\n');

    const apiKey = process.env.OPENAI_API_KEY || 'demo-key';

    // Create a global stream that listens to all events
    const { EventStream } = await import('../events/event-stream');
    const globalStream = new EventStream({ 
        globalEvents: true,
        enableMetrics: true
    });

    // Monitor all events across all agents
    const eventCounts = new Map<string, number>();
    
    globalStream.onPattern('*', (eventName: string, data: any) => {
        const count = eventCounts.get(eventName) || 0;
        eventCounts.set(eventName, count + 1);
        console.log(`📡 Global event: ${eventName}`);
    });

    // Create multiple agents with different namespaces
    const agent1Stream = createNamespacedStream('sales-agent');
    const agent2Stream = createNamespacedStream('support-agent');

    const agent1 = createEventChatNodeWithOpenAI(apiKey, agent1Stream, {
        systemMessage: 'You are a sales agent.',
        nodeId: 'sales-agent-1'
    });

    const agent2 = createEventChatNodeWithOpenAI(apiKey, agent2Stream, {
        systemMessage: 'You are a support agent.',
        nodeId: 'support-agent-1'
    });

    // Create storage
    const storage1: ExampleStorage = { sessionId: 'sales-session' };
    const storage2: ExampleStorage = { sessionId: 'support-session' };

    // Generate some activity
    console.log('Generating agent activity...\n');
    
    await Promise.all([
        agent1.sendMessage(storage1, 'What are your product features?'),
        agent2.sendMessage(storage2, 'I need help with my account')
    ]);

    // Display global statistics
    console.log('\n📊 Global Event Statistics:');
    console.log('-'.repeat(30));
    for (const [event, count] of eventCounts.entries()) {
        console.log(`${event}: ${count}`);
    }

    const globalStats = globalStream.getStats();
    console.log(`\nTotal global events monitored: ${globalStats.metrics?.totalEvents || 0}`);

    console.log('\n✅ Global monitoring example complete!\n');
}

/**
 * Run all examples
 */
export async function runAllEventStreamingExamples() {
    console.log('🎯 BackpackFlow Event Streaming Examples');
    console.log('========================================\n');

    try {
        await basicEventStreamingExample();
        await multiAgentEventStreamingExample();
        await flowEventStreamingExample();
        await globalMonitoringExample();
        
        console.log('🎉 All event streaming examples completed successfully!');
        console.log('\n💡 Key Features Demonstrated:');
        console.log('   • Hierarchical event naming (namespace:category:action)');
        console.log('   • Real-time LLM content streaming');
        console.log('   • Node lifecycle monitoring');
        console.log('   • Flow transition tracking');
        console.log('   • Multi-agent namespace isolation');
        console.log('   • Global event monitoring');
        console.log('   • Comprehensive metrics and statistics');
        
    } catch (error) {
        console.error('❌ Error running examples:', error);
        throw error;
    }
}

// Export individual functions for selective use
export {
    basicEventStreamingExample as basic,
    multiAgentEventStreamingExample as multiAgent,
    flowEventStreamingExample as flow,
    globalMonitoringExample as global
};
