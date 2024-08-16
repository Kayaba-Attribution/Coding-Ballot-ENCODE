import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import type { PublicClient } from "viem/clients/createPublicClient";
import { toHex, hexToString } from "viem/utils";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { getContract } from 'viem'

import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";

dotenv.config();



function cropAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
// cosntants
const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";
const participantApiKey = process.env.PARTICIPANT_API_KEY || "";

const Participant = "0xea17C45EC037D305bC4148f1fc64A27Cb8B0cfED"

async function getDeployerWalletClient(publicClient: any, privateKey:any) {
    // use view to get wallet 
    const account = privateKeyToAccount(`0x${privateKey}`);
    // connect wallet client to Sepolia
    const deployer = createWalletClient({
        account,
        chain: sepolia,
        transport: http(`${providerApiKey}`),
    });
    console.log("Deployer address:", cropAddress(deployer.account.address));

    // get balance
    const balance = await publicClient.getBalance({
        address: deployer.account.address,
    });
    console.log(
        "Deployer Connected!! \nbalance:",
        formatEther(balance),
        deployer.chain.nativeCurrency.symbol
    );
    return deployer;
}

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

    const proposalIndex = parameters[1];
    if (isNaN(Number(proposalIndex))) throw new Error("Invalid proposal index");

    // contract proposalIndex

    // ! Attaching the contract and checking the selected option
    console.log("Proposal selected: ");
    const proposal = (await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "proposals",
        args: [BigInt(proposalIndex)],
    })) as any[];
    const name = hexToString(proposal[0], { size: 32 });
    console.log("Voting to proposal", name);
    console.log("Confirm? (Y/n)");

    // get wallet client
    const deployer = await getDeployerWalletClient(publicClient, deployerPrivateKey);
    const participant = await getDeployerWalletClient(publicClient, participantApiKey);

    // TODO: how does this work? stdin.addListener
    // ! send tx

    // VOTE DONE
    // const stdin = process.stdin;
    // stdin.addListener("data", async function (d) {
    //     if (d.toString().trim().toLowerCase() != "n") {
    //         // change object to person that is voting
    //         // ie. deployer or participant
    //         const hash = await participant.writeContract({
    //             address: contractAddress,
    //             abi,
    //             functionName: "vote",
    //             args: [BigInt(proposalIndex)],
    //         });
    //         console.log("Transaction hash:", hash);
    //         console.log("Waiting for confirmations...");
    //         const receipt = await publicClient.waitForTransactionReceipt({ hash });
    //         console.log("Transaction confirmed");
    //     } else {
    //         console.log("Operation cancelled");
    //     }
    //     process.exit();
    // });

    //GIVE VOTING POWER DONE
    const stdin = process.stdin;
    stdin.addListener("data", async function (d) {
        if (d.toString().trim().toLowerCase() != "n") {
            const hash = await deployer.writeContract({
                address: contractAddress,
                abi,
                functionName: "giveRightToVote",
                args: ["0x888ebea583209695A27BD9b8f604aB2FfbeF0654"]
            });
            console.log("GIVE VOTING POWER");
            console.log("Transaction hash:", hash);
            console.log("Waiting for confirmations...");
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log("Transaction confirmed");
        } else {
            console.log("Operation cancelled");
        }
        process.exit();
    });

    /*
    Delegate Voting Power:
    1. Chairman gives new voter the right to vote
    2. New voter delegates to chairman
    3. Chairman votes on behalf of new voter
    */
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});