import { Node, Flow, BatchNode, ParallelBatchNode } from '../src/pocketflow';

// Test different aspects of PocketFlow
class ParameterNode extends Node {
  async prep(shared: any): Promise<unknown> {
    console.log('ParameterNode prep with shared:', shared);
    return { prepData: 'prepared data' };
  }
  
  async exec(prepRes: unknown): Promise<unknown> {
    console.log('ParameterNode exec with prep result:', prepRes);
    return { message: 'ParameterNode executed!' };
  }
  
  async post(shared: any, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
    console.log('ParameterNode post with exec result:', execRes);
    return 'success'; // This will determine the next action
  }
}

class ConditionalNode extends Node {
  async exec(prepRes: unknown): Promise<unknown> {
    console.log('ConditionalNode exec');
    return { message: 'ConditionalNode executed!' };
  }
  
  async post(shared: any, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
    // Return different actions based on some condition
    const shouldContinue = Math.random() > 0.5;
    console.log(`ConditionalNode decided to: ${shouldContinue ? 'continue' : 'stop'}`);
    return shouldContinue ? 'continue' : 'stop';
  }
}

class BatchTestNode extends BatchNode {
  async exec(item: unknown): Promise<unknown> {
    console.log('BatchTestNode processing item:', item);
    return { processed: item, timestamp: Date.now() };
  }
}

async function explorePocketFlow() {
  console.log('=== Exploring PocketFlow Features ===\n');
  
  // 1. Test basic flow
  console.log('1. Testing basic flow:');
  const paramNode = new ParameterNode();
  
  const flow1 = new Flow(paramNode);
  await flow1.run({ testData: 'shared data' });
  console.log('\n');
  
  // 2. Test conditional flow
  console.log('2. Testing conditional flow:');
  const conditionalNode = new ConditionalNode();
  const successNode = new ParameterNode();
  const stopNode = new ParameterNode();
  
  // Connect nodes manually since 'on' method doesn't exist
  conditionalNode.next(successNode);
  
  const flow2 = new Flow(conditionalNode);
  await flow2.run({ testData: 'conditional test' });
  console.log('\n');
  
  // 3. Test batch processing
  console.log('3. Testing batch processing:');
  const batchNode = new BatchTestNode();
  const items = ['item1', 'item2', 'item3'];
  
  // Use the public exec method instead of _exec
  const results = await Promise.all(items.map(item => batchNode.exec(item)));
  console.log('Batch results:', results);
  console.log('\n');
  
  console.log('=== Exploration Complete ===');
}

// Run the exploration
explorePocketFlow().catch(console.error); 