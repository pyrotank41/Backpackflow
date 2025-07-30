import { Node, Flow } from '../src/pocketflow';

// Simple test to understand PocketFlow
class SimpleNode extends Node {
  async exec(prepRes: unknown): Promise<unknown> {
    console.log('Executing SimpleNode with prep result:', prepRes);
    return { message: 'Hello from SimpleNode!' };
  }
}

class AnotherNode extends Node {
  async exec(prepRes: unknown): Promise<unknown> {
    console.log('Executing AnotherNode with prep result:', prepRes);
    return { message: 'Hello from AnotherNode!' };
  }
}

// Test the basic functionality
async function testPocketFlow() {
  console.log('=== Testing PocketFlow ===');
  
  // Create nodes
  const node1 = new SimpleNode();
  const node2 = new AnotherNode();
  
  // Connect them
  node1.next(node2);
  
  // Create a flow
  const flow = new Flow(node1);
  
  // Run the flow
  const result = await flow.run({ testData: 'shared data' });
  
  console.log('Flow completed with result:', result);
}

// Run the test
testPocketFlow().catch(console.error); 