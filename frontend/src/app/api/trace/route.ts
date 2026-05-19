import { NextRequest, NextResponse } from "next/server";

import { provider } from "@/shared/apis/rpc";


export async function POST(req: NextRequest) {
  console.log(" ");
  console.log("--- backend api trace called ---");
  try {
    const { txHash } = await req.json();
    if (!txHash) {
      console.log("backend api trace: missing txHash");
      return NextResponse.json(
        { error: "backend api trace: missing txHash" }, 
        { status: 400 }
      );
    }

    console.log("fetching tx: ", txHash, "  ...");
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    console.log("tx loaded");

    console.log(" ")
    console.log("requesting trace...");
    const trace = await provider.send("debug_traceTransaction", [
      txHash,
      {
        // tracer: "structLogs",
        timeout: "30s",
      },
    ]);
    console.log("trace received");

    console.log("========== Raw Trace Beg ==========");
    console.dir(trace, { depth: null });
    console.log("========== Raw Trace End ==========");
    
    console.log(" ");
    const structLogs = trace?.structLogs || [];
    console.log("Trace Summary:");
    console.log("total opcodes:", structLogs.length);
    const gasUsedByOp: Record<string, number> = {};
    for (const log of structLogs) {
      const op = log.op;
      const gasCost = log.gasCost || 0;
      gasUsedByOp[op] = (gasUsedByOp[op] || 0) + gasCost;
    }
    console.log("gas by opcode:");
    console.table(gasUsedByOp);

    console.log("backend api trace exec successfully")
    return NextResponse.json({ tx, receipt, trace });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}