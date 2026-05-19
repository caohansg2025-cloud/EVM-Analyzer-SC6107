import { JsonRpcProvider } from "ethers/providers"


export const provider = new JsonRpcProvider(
  process.env.QUICKNODE_RPC_URL
);
