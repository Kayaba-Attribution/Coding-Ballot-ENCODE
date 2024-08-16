import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { toHex, hexToString } from "viem/utils";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { cropAddress, getWalletClient } from "./Helpers";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";

dotenv.config();

// cosntants
const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";
const participantApiKey = process.env.PARTICIPANT_API_KEY || "";

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
    const deployer = await getWalletClient(publicClient, deployerPrivateKey);
    const participant = await getWalletClient(publicClient, participantApiKey);

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
                args: ["0x2002469Ae0068e8863a7531B5FFD56E283752D8F"]
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