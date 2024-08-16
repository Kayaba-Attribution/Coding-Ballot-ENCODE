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

// example
// npx ts-node --files ./scripts/GiveRigths.ts "0xaa9fc66cc11bf4268e08cf9431bf40ea4d8300a6" "0x0322Fbaef4f28E2854711237C848F6111e725874"

// Transaction hash: 0x07e0dd1d42781a50a29fc5f61a5849c9eeb94db2ecade45fb186896bae4900e2

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

    const addressToGiveRigthsTo = parameters[1];
    if (!/^0x[a-fA-F0-9]{40}$/.test(addressToGiveRigthsTo))
        throw new Error("Invalid contract address");

    // get wallet client
    const deployer = await getWalletClient(publicClient, deployerPrivateKey);
    const participant = await getWalletClient(publicClient, participantApiKey);

    // TODO: how does this work? stdin.addListener
    // ! send tx
    //GIVE VOTING POWER DONE
    const stdin = process.stdin;
    stdin.addListener("data", async function (d) {
        if (d.toString().trim().toLowerCase() != "n") {
            const hash = await deployer.writeContract({
                address: contractAddress,
                abi,
                functionName: "giveRightToVote",
                args: [addressToGiveRigthsTo]
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