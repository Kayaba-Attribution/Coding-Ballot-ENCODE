import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import type { PublicClient } from "viem/clients/createPublicClient";
import { toHex, hexToString } from "viem/utils";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { cropAddress, getWalletClient } from "./Helpers";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";

dotenv.config();


const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";
const DEPLOY = false;

async function main() {

    // npx ts-node --files ./scripts/DeployWithViem.ts "arg1" "arg2" "arg3"

    // get args
    const proposals = process.argv.slice(2);
    if (!proposals || proposals.length < 1)
        throw new Error("Proposals not provided");

    // see proposals
    console.log("Proposals:");
    proposals.forEach((element, index) => {
        console.log(`Proposal N. ${index + 1}: ${element}`);
    });

    // connect public client
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(`${providerApiKey}`),
    });

    // check connection using getBlockNumber
    const blockNumber = await publicClient.getBlockNumber();
    console.log("Last block number:", blockNumber);

    // get wallet client
    const deployer = await getWalletClient(publicClient, deployerPrivateKey);

    if (DEPLOY) {
        console.log("\nDeploying Ballot contract");
        // deploy, pass contract ABI, bytecode and args
        const hash = await deployer.deployContract({
            abi,
            bytecode: bytecode as `0x${string}`,
            args: [proposals.map((prop) => toHex(prop, { size: 32 }))],
        });
        console.log("Transaction hash:", hash);
        console.log("Waiting for confirmations...");

        // wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("Ballot contract deployed to:", receipt.contractAddress);

        // type check for CA
        if (!receipt.contractAddress) {
            console.log("Contract deployment failed");
            return;
        }

        console.log("Proposals: ");
        for (let index = 0; index < proposals.length; index++) {
          const proposal = (await publicClient.readContract({
            address: receipt.contractAddress,
            abi,
            functionName: "proposals",
            args: [BigInt(index)],
          })) as any[];
          const name = hexToString(proposal[0], { size: 32 });
          console.log({ index, name, proposal });
        }
    } else {
        console.log("Deployment disabled");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});