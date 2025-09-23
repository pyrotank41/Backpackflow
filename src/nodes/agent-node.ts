import { Node, Flow } from '../pocketflow';
import { 
    DecisionNode, 
    ToolParamGenerationNode, 
    ToolExecutionNode, 
    FinalAnswerNode,
    LLMNodeConfig,
} from './index';
import { EventStreamer } from '../events/event-streamer';

// ===== AGENT NODE CONFIGURATION =====

export interface AgentNodeConfig {
    // System prompts for each stage (optional - will use defaults if not provided)
    decisionPrompt?: string;
    paramGenerationPrompt?: string;
    finalAnswerPrompt?: string;
    
    // LLM Configuration (applied to all internal nodes) - instructorClient is required
    llmConfig: LLMNodeConfig;
    
    // Agent identification
    agentName?: string;
    
    // Decision loop control
    maxTurns?: number;  // Maximum number of decision loop turns before forcing final answer
    
    // Event Streaming (optional - much cleaner API!)
    eventStreamer?: EventStreamer;
    namespace?: string;
}

// ===== AGENT NODE STORAGE =====

export interface AgentNodeStorage {
    // Input (required)
    messages: any[];
    tool_manager: any;
    
    // Input (optional - will be auto-discovered if not provided)
    available_tools?: any[];
    
    // Internal state (managed by sub-nodes)
    currentDecision?: any;
    toolRequests?: any[];
    toolParameters?: any[];
    toolExecutionResults?: any[];
    finalAnswer?: string;
    
    // Output
    agentResponse?: string;
    conversationHistory?: any[];
}

// ===== AGENT NODE =====

export class AgentNode extends Node {
    private decisionNode: DecisionNode;
    private toolParamNode: ToolParamGenerationNode;
    private toolExecutionNode: ToolExecutionNode;
    private finalAnswerNode: FinalAnswerNode;
    private flow!: Flow;
    
    public agentName: string;

    constructor(config: AgentNodeConfig) {
        super();
        
        // Validate that llmConfig with instructorClient is provided
        if (!config.llmConfig || !config.llmConfig.instructorClient) {
            throw new Error('AgentNode requires llmConfig with instructorClient to be provided');
        }
        
        this.agentName = config.agentName || 'Agent';
        
        // Prepare LLM config with event streaming (if provided)
        const llmConfigWithEvents = {
            ...config.llmConfig,
            ...(config.eventStreamer && { 
                eventStreamer: config.eventStreamer,
                namespace: config.namespace || this.agentName.toLowerCase()
            })
        };
        
        // Create internal nodes - only pass custom prompts if provided, let nodes use their defaults
        this.decisionNode = new DecisionNode({
            ...llmConfigWithEvents,
            ...(config.decisionPrompt && { systemPrompt: config.decisionPrompt }),
            ...(config.maxTurns && { maxTurns: config.maxTurns })
        });
        
        this.toolParamNode = new ToolParamGenerationNode({
            ...llmConfigWithEvents,
            ...(config.paramGenerationPrompt && { systemPrompt: config.paramGenerationPrompt })
        });
        
        this.toolExecutionNode = new ToolExecutionNode({
            ...(config.eventStreamer && { 
                eventStreamer: config.eventStreamer,
                namespace: config.namespace || this.agentName.toLowerCase()
            })
        });

        
        this.finalAnswerNode = new FinalAnswerNode({
            ...llmConfigWithEvents,
            ...(config.finalAnswerPrompt && { systemPrompt: config.finalAnswerPrompt })
        });
        
        // Set up the internal flow
        this.setupInternalFlow();
    }
    
    private setupInternalFlow(): void {
        // Connect the nodes with reflection loop
        this.decisionNode.on("tool_call_request", this.toolParamNode);
        this.decisionNode.on("generate_final_response", this.finalAnswerNode);
        this.toolParamNode.on("tool_execution", this.toolExecutionNode);
        this.toolExecutionNode.on("decision", this.decisionNode);
        
        // Create the flow
        this.flow = new Flow(this.decisionNode);
    }
    
    // ===== NODE LIFECYCLE METHODS =====
    
    async prep(shared: AgentNodeStorage): Promise<unknown> {
        // Validate required inputs
        if (!shared.messages || !Array.isArray(shared.messages)) {
            throw new Error('AgentNode requires messages array in shared storage');
        }
        
        if (!shared.tool_manager) {
            throw new Error('AgentNode requires tool_manager in shared storage');
        }
        
        // Auto-discover available tools if not provided
        if (!shared.available_tools || !Array.isArray(shared.available_tools)) {
            console.log('🔍 Auto-discovering available tools...');
            try {
                shared.available_tools = await shared.tool_manager.discoverTools();
                console.log(`✅ Discovered ${shared.available_tools?.length || 0} tools`);
            } catch (error) {
                console.warn('⚠️  Failed to auto-discover tools:', error);
                shared.available_tools = [];
            }
        } else {
            console.log(`✅ Using provided ${shared.available_tools?.length || 0} tools`);
        }
        
        // Return the shared storage as prep result (the flow will handle the rest)
        return shared;
    }
    
    async exec(prepRes: AgentNodeStorage): Promise<unknown> {
        // Execute the internal flow
        await this.flow.run(prepRes);
        
        // Return the final answer
        return {
            agentResponse: prepRes.finalAnswer,
            conversationHistory: prepRes.messages,
            agentName: this.agentName
        };
    }
    
    async post(shared: AgentNodeStorage, prepRes: unknown, execRes: any): Promise<string | undefined> {
        // Update shared storage with results
        shared.agentResponse = execRes.agentResponse;
        shared.conversationHistory = execRes.conversationHistory;
        
        console.log(`✅ ${this.agentName} completed processing`);
        console.log(`📝 Response: ${execRes.agentResponse?.substring(0, 100)}...`);
        
        return undefined; // End of flow
    }
    
    // ===== UTILITY METHODS =====
    
    /**
     * Get the current state of the agent's internal processing
     */
    getInternalState(shared: AgentNodeStorage): any {
        return {
            currentDecision: shared.currentDecision,
            toolRequestsCount: shared.toolRequests?.length || 0,
            toolParametersCount: shared.toolParameters?.length || 0,
            toolExecutionResultsCount: shared.toolExecutionResults?.length || 0,
            hasFinalAnswer: !!shared.finalAnswer,
            turnCount: (shared as any).turnCount || 0,
            maxTurns: (shared as any).maxTurns || 10
        };
    }
    
    /**
     * Get information about the internal nodes
     */
    getNodeInfo(): any {
        return {
            agentName: this.agentName,
            internalNodes: {
                decision: this.decisionNode.constructor.name,
                paramGeneration: this.toolParamNode.constructor.name,
                toolExecution: this.toolExecutionNode.constructor.name,
                finalAnswer: this.finalAnswerNode.constructor.name
            }
        };
    }
}
