"use client";

import { useState } from "react";


export default function TraceFetcher() {
  const [tx, setTx] = useState("");
  const [trace, setTrace] = useState(null);

  async function fetchTrace() {
    const res = await fetch("http://localhost:3000/api/trace", {
      method: "POST",
      body: JSON.stringify({ txHash: tx }),
    });
    const data = await res.json();
    setTrace(data.trace);
  }

  return (
    <div>
      <input
        value={tx}
        onChange={(e) => setTx(e.target.value)}
        placeholder="Tx Hash"
      />
      <button onClick={fetchTrace}>Analyze</button>

      <pre>{JSON.stringify(trace, null, 2)}</pre>
    </div>
  );
}