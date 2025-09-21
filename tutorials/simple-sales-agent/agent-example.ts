import { 
    MCPServerManager, 
    MCPServerConfig,
    AgentNode,
    EventStreamer,
    createInstructorClient
} from "../../src/nodes";
import { StreamEventType } from "../../src/events/event-streamer";
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '.env') });

// Toggle for streaming vs non-streaming
const ENABLE_STREAMING = process.argv.includes('--stream');

const mcp_server_configs: MCPServerConfig[] = [
    {
        name: "erp_sales",
        command: "sh",
        args: ["-c", "cd /Users/karansinghkochar/Documents/GitHub/product-quote-mcp && uv run python -m src.standalone_erp_server"],
        transport: "stdio"
    }
];

async function agentExample() {
    console.log('🎛️  EVENT-DRIVEN STREAMING:');
    console.log('   • Default: Non-streaming mode (just final results)');
    console.log('   • Add --stream flag to listen to real-time events');
    console.log(`   • Current mode: ${ENABLE_STREAMING ? 'STREAMING ✅' : 'NON-STREAMING ❌'}\n`);
    
    const mcp_server_manager = new MCPServerManager();
    
    await mcp_server_manager.connectToServers(mcp_server_configs);

    // Set up event streaming if enabled
    let eventStreamer: EventStreamer | undefined;
    let streamChunkCount = 0;
    
    if (ENABLE_STREAMING) {
        eventStreamer = EventStreamer.getInstance();
        
        // Subscribe to events for real-time streaming
        eventStreamer.subscribe('sales_agent', (event) => {
            streamChunkCount++;
            
             switch (event.type) {
                 case StreamEventType.PROGRESS:
                     console.log(`[PROGRESS] ${event.nodeId}: ${JSON.stringify(event.content)}`);
                     break;
                 case StreamEventType.CHUNK:
                     // Real-time text streaming
                     process.stdout.write(event.content);
                     break;
                 case StreamEventType.METADATA:
                     console.log(`[METADATA] ${event.nodeId}: ${JSON.stringify(event.content)}`);
                     break;
                 case StreamEventType.FINAL:
                     console.log(`[FINAL] ${JSON.stringify(event.content)}`);
                     break;
                 case StreamEventType.ERROR:
                     console.log(`[ERROR] ${JSON.stringify(event.content)}`);
                     break;
             }
        });
    }

    // Create LLM client (auto-detects OpenAI vs Azure OpenAI)
    console.log('🔍 Creating LLM client...');
    const instructorClient = createInstructorClient({ provider: 'azure' });

    // Create a sales agent with custom prompts and optional event streaming
    const salesAgent = new AgentNode({
        agentName: "SalesAgent",

        // LLM configuration with explicit client
        llmConfig: {
            instructorClient: instructorClient,  // Explicitly pass the client
            model: 'gpt4.1',
            temperature: 0.1
        },
        
        // Event streaming configuration (much cleaner API! 🎉)
        ...(eventStreamer && { 
            eventStreamer: eventStreamer,
            namespace: 'sales_agent'
        })
    });

    // Prepare the shared storage - much simpler now!
    const sharedStorage = {
        messages: [{
            role: 'user' as const, 
            content: 'Please generate a quote for a 10 amp MCB, C curve and 20 amp MCB, C curve. Also, do we have a customer named "Prachi"?'
        }],
        tool_manager: mcp_server_manager
        // available_tools will be auto-discovered by AgentNode!
    };

    console.log('🤖 Starting Sales Agent...\n');
    console.log(`Agent Info:`, salesAgent.getNodeInfo());
    console.log(`🎛️  Event Streaming: ${ENABLE_STREAMING ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log('\n' + '='.repeat(80));

    // Run the agent - single execution path!
    const startTime = Date.now();
    
    try {
        // Auto-discover tools and prep
        console.log('🔍 Auto-discovering available tools...');
        const prepRes = await salesAgent.prep(sharedStorage) as any;
        console.log(`✅ Discovered ${prepRes.available_tools?.length || 0} tools`);
        console.log('✅ Agent prep completed');
        
        // Single execution path - events are emitted automatically if EventStreamer is configured
        if (ENABLE_STREAMING) {
            console.log('📡 Agent executing with real-time events...\n');
            console.log('─'.repeat(80) + '\n');
        } else {
            console.log('🔄 Agent executing (events ignored)...\n');
        }
        
        const execRes = await salesAgent.exec(prepRes) as any;
        
        if (ENABLE_STREAMING) {
            console.log('\n' + '─'.repeat(80));
            console.log(`📦 Received ${streamChunkCount} events`);
        }
        
        // Post processing
        await salesAgent.post(sharedStorage, prepRes, execRes);
        console.log('✅ Agent execution completed');
        
        const endTime = Date.now();
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 EXECUTION SUMMARY:');
        console.log(`⏱️  Total time: ${endTime - startTime}ms`);
        console.log(`🤖 Agent: ${salesAgent.agentName}`);
        console.log(`🎛️  Mode: ${ENABLE_STREAMING ? 'Event-driven streaming' : 'Non-streaming'}`);
        console.log(`📝 Response length: ${(sharedStorage as any).finalAnswer?.length || 0} characters`);
        
        if (ENABLE_STREAMING) {
            console.log(`📦 Events received: ${streamChunkCount}`);
        }
        
        console.log('\n📋 Internal State:');
        console.log(JSON.stringify(salesAgent.getInternalState(sharedStorage), null, 2));
        
        console.log('\n💬 FINAL RESPONSE:');
        console.log('-'.repeat(50));
        console.log((sharedStorage as any).finalAnswer || 'No response generated');
        
    } catch (error) {
        console.error('❌ Agent execution failed:', error);
    }

    // Cleanup
    if (eventStreamer) {
        eventStreamer.clearAll();
    }
    await mcp_server_manager.disconnect();
}

async function main() {
    try {
        await agentExample();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main().catch(console.error);
