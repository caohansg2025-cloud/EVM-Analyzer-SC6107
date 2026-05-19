/**
 * The trace parser and related logic for parsing transactions' trace, and 
 * analyze the gas consumption of downstream traces
 * 
 */

interface CallFrame {
  address: string
  input: string
  gasUsed: number
  children: CallFrame[]
  // opcodes: OpcodeLog[]
}


