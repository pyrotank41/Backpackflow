import { BaseLLMNode, LLMNodeConfig, EventStreamingConfig } from './base-llm-node';
import { StreamEventType } from '../events/event-streamer';
import { 
    FinalAnswerNodeStorage, 
    ChatMessage, 
    ToolRequestWithId, 
    ToolExecutionResultWithId,
    getToolContext 
} from './types';

// ===== FINAL ANSWER NODE CONFIGURATION =====

export interface FinalAnswerNodeConfig extends LLMNodeConfig, EventStreamingConfig {
    // Additional config options can be added here
    includeToolInteractionInHistory?: boolean;  // Default: true
}

// ===== FINAL ANSWER NODE =====

export class FinalAnswerNode extends BaseLLMNode {
    private includeToolInteractionInHistory: boolean;
    
    constructor(config: FinalAnswerNodeConfig) {
        super(config);
        this.includeToolInteractionInHistory = config.includeToolInteractionInHistory ?? true;
    }
    
    protected getDefaultSystemPrompt(): string {
        return `You are a professional assistant. Based on the tool execution results, provide a comprehensive, helpful response to the user's request.

Guidelines:
- Be clear and concise
- Include specific details when available (SKU, name, price, etc.)
- Address all parts of the user's request
- If some information wasn't found, mention it politely
- Use a professional but friendly tone
- Format the response nicely for readability`;
    }
    
    /**
     * Stream LLM response and emit chunks as events
     */
    private async callLLMWithStreaming(messages: any[]): Promise<string> {
        // Use the underlying OpenAI client directly for streaming
        const openaiClient = this.client.client || this.client;
        
        const stream = await openaiClient.chat.completions.create({
            messages,
            model: this.model,
            temperature: this.temperature,
            stream: true
        });

        let fullResponse = '';
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                
                // Emit chunk event for real-time streaming
                this.emitEvent(StreamEventType.CHUNK, content);
            }
        }
        
        return fullResponse;
    }

    async prep(shared: FinalAnswerNodeStorage): Promise<unknown> {
        const toolResults = shared.toolExecutionResults || [];
        const hasToolResults = toolResults.length > 0;

        // reset the decison count
        shared.turnCount = 0;

        // Construct full OpenAI conversation format
        if (shared.messages === undefined) {
            shared.messages = [];
        }
        if (shared.messages.length > 0 && shared.messages[0].role === "system") {
            shared.messages[0].content = this.systemPrompt;
        }
        else {
            shared.messages = [{ role: "system", content: this.systemPrompt }, ...(shared.messages)]
        }
        const conversationHistory: ChatMessage[] = shared.messages;

        // Add tool interaction to conversation if tools were used and option is enabled
        if (hasToolResults && shared.toolRequests && shared.toolRequests.length > 0 && this.includeToolInteractionInHistory) {
            // Add assistant message with tool calls
            const toolCalls = shared.toolRequests.map((req: ToolRequestWithId) => {
                const context = getToolContext(req.id, shared);
                return {
                    id: req.id, // Use real tc_ IDs (39 chars, under OpenAI 40 char limit)
                    type: "function" as const,
                    function: {
                        name: req.toolName,
                        arguments: JSON.stringify(context.params?.parameters || {})
                    }
                };
            });

            conversationHistory.push({
                role: "assistant",
                content: "I'll help you find that information using our available tools.",
                tool_calls: toolCalls
            });

            // Add tool responses
            shared.toolExecutionResults?.forEach((result: ToolExecutionResultWithId) => {
                conversationHistory.push({
                    role: "tool",
                    tool_call_id: result.toolRequestId, // Use real tc_ IDs
                    content: JSON.stringify(result.executionResult.content)
                });
            });
        } 
        

        return {
            conversationHistory,
            hasToolResults
        };
    }

    async exec(prepRes: any): Promise<unknown> {
        const { conversationHistory, hasToolResults } = prepRes;

        // Emit progress event
        this.emitEvent(StreamEventType.PROGRESS, { 
            status: 'generating_final_answer',
            has_tool_results: hasToolResults
        });

        let finalConversation: any[];
        
        finalConversation = conversationHistory;
  

        // Check if we should stream the response
        if (this.eventStreamer) {
            // Stream the response
            const finalAnswer = await this.callLLMWithStreaming(finalConversation);
            
            // Emit final event
            this.emitEvent(StreamEventType.FINAL, { 
                response_generated: true,
                response_length: finalAnswer.length,
                content: finalAnswer
            });
            
            return { 
                finalAnswer,
                conversationHistory: finalConversation
            };
        } else {
            // Non-streaming response
            const response = await this.callLLMRegular(finalConversation);
            const finalAnswer = response.choices[0].message.content;
            
            return { 
                finalAnswer,
                conversationHistory: finalConversation
            };
        }
    }

    async post(shared: FinalAnswerNodeStorage, prepRes: any, execRes: any): Promise<string | undefined> {
        shared.finalAnswer = execRes.finalAnswer;
        
        // Update shared.messages with the complete conversation history
        // This makes the system ready for multi-turn conversations
        if (execRes.conversationHistory) {
            // Add the final assistant response to complete the conversation
            const completeConversation = [
                ...execRes.conversationHistory,
                {
                    role: "assistant",
                    content: execRes.finalAnswer
                }
            ];
            shared.messages = completeConversation;
        }

        

        // console.log("messages: " + JSON.stringify(shared.messages, null, 2));
        
        // Return undefined to signal end of flow
        return undefined;
    }
}
