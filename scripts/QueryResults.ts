import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import type { PublicClient } from "viem/clients/createPublicClient";
import { toHex, hexToString } from "viem/utils";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";

import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
dotenv.config();

function cropAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Query the proposals of a Ballot contract
 * 1. Proposals
 * 2. Voter Information
 * 3. Winning Proposal
 * 4. winner Name
 */

// Constants
const providerApiKey = process.env.ALCHEMY_API_KEY || "";

async function main() {
    // connect public client
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(`${providerApiKey}`),
    });


    console.log("Proposals: ");
    // Get proposals and contract address
    const args = process.argv.slice(2);
    if (args.length !== 4) {
        throw new Error("Must provide exactly 3 proposals and a contract address");
    }
    const proposals = args.slice(0, 3);
    const contractAddress = args[3] as `0x${string}`;

    // check contract address
    console.log(`Ballot Contract Address: ${contractAddress}`);

    // read proposals
    for (let index = 0; index < proposals.length; index++) {
        // read proposal
        const proposal = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: "proposals",
            args: [BigInt(index)],
        }) as any[];
        const name = hexToString(proposal[0], { size: 32 });
        console.table({ index, name, proposal });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});