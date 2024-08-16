import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { toHex, hexToString } from "viem/utils";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { cropAddress, getWalletClient, getVoterData } from "./Helpers";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";

dotenv.config();

// cosntants
const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";
const altKey = process.env.ALT_KEY || "";

// example
// ❯ npx ts-node --files ./scripts/DelegateVote.ts "0xaa9fc66cc11bf4268e08cf9431bf40ea4d8300a6" "0x888ebea583209695A27BD9b8f604aB2FfbeF0654" "0x777410F6AE513F55c714c6843D66929dc7933280"

/*
Delegate Voting Power:
1. Check voter information
2. New voter delegates to chairman

Voter Information: 0x7774...3280 (Chairman has voted)
┌──────────┬──────────────────────────────────────────────┐
│ (index)  │                    Values                    │
├──────────┼──────────────────────────────────────────────┤
│ Address  │ '0x777410F6AE513F55c714c6843D66929dc7933280' │
│  Weight  │                     '1'                      │
│  Voted   │                     true                     │
│ Delegate │ '0x0000000000000000000000000000000000000000' │
│   Vote   │                     '0'                      │
└──────────┴──────────────────────────────────────────────┘
Voter Information: 0x888e...0654 (Guy has not voted and can vote) 
┌──────────┬──────────────────────────────────────────────┐
│ (index)  │                    Values                    │
├──────────┼──────────────────────────────────────────────┤
│ Address  │ '0x888ebea583209695A27BD9b8f604aB2FfbeF0654' │
│  Weight  │                     '1'                      │
│  Voted   │                    false                     │
│ Delegate │ '0x0000000000000000000000000000000000000000' │
│   Vote   │                     '0'                      │
└──────────┴──────────────────────────────────────────────┘

2. New voter delegates to chairman
0x888ebea583209695A27BD9b8f604aB2FfbeF0654 (giver) delegates to 0x777410F6AE513F55c714c6843D66929dc7933280 (receiver)

Txn Hash: 0x5e9311b58f266eebae445e91fd2ab684b056658029db303cb7e2b1fb91945ed9

Voter Information: 0x7774...3280
┌──────────┬──────────────────────────────────────────────┐
│ (index)  │                    Values                    │
├──────────┼──────────────────────────────────────────────┤
│ Address  │ '0x777410F6AE513F55c714c6843D66929dc7933280' │
│  Weight  │                     '1'                      │
│  Voted   │                     true                     │
│ Delegate │ '0x0000000000000000000000000000000000000000' │
│   Vote   │                     '0'                      │
└──────────┴──────────────────────────────────────────────┘
Voter Information: 0x888e...0654
┌──────────┬──────────────────────────────────────────────┐
│ (index)  │                    Values                    │
├──────────┼──────────────────────────────────────────────┤
│ Address  │ '0x888ebea583209695A27BD9b8f604aB2FfbeF0654' │
│  Weight  │                     '1'                      │
│  Voted   │                     true                     │
│ Delegate │ '0x777410F6AE513F55c714c6843D66929dc7933280' │
│   Vote   │                     '0'                      │
└──────────┴──────────────────────────────────────────────┘

+ Participant Delegated to Chairman

*/

async function main() {

    // connect public client
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(`${providerApiKey}`),
    });

    // getting the args
    const parameters = process.argv.slice(2);
    //checks
    if (!parameters || parameters.length < 2)
        throw new Error("Parameters not provided");

    const contractAddress = parameters[0] as `0x${string}`;
    if (!contractAddress) throw new Error("Contract address not provided");
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
        throw new Error("Invalid contract address");

    const voteGiver = parameters[1];
    if (!/^0x[a-fA-F0-9]{40}$/.test(voteGiver))
        throw new Error("Invalid contract address");

    const voteReceiver = parameters[2];
    if (!/^0x[a-fA-F0-9]{40}$/.test(voteReceiver))
        throw new Error("Invalid contract address");

    // get wallet client
    const deployer = await getWalletClient(publicClient, deployerPrivateKey);
    const participant = await getWalletClient(publicClient, altKey);

    // check voters info
    console.log(`Voter Information: ${cropAddress(deployer.account.address)}`);
    await getVoterData(publicClient, contractAddress, deployer.account.address);
    console.log(`Voter Information: ${cropAddress(participant.account.address)}`)
    await getVoterData(publicClient, contractAddress, participant.account.address);

    // TODO: how does this work? stdin.addListener
    // ! send tx
    // DELEGATE VOTING POWER DONE
    const stdin = process.stdin;
    stdin.addListener("data", async function (d) {
        if (d.toString().trim().toLowerCase() != "n") {
            const hash = await participant.writeContract({
                address: contractAddress,
                abi,
                functionName: "delegate",
                args: [voteReceiver]
            });
            console.log("DELEGATE VOTING POWER");
            console.log("Transaction hash:", hash);
            console.log("Waiting for confirmations...");
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log("Transaction confirmed");
        } else {
            console.log("Operation cancelled");
        }
        process.exit();
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});