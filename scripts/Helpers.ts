import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config();
const providerApiKey = process.env.ALCHEMY_API_KEY || "";

function cropAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function getWalletClient(publicClient: any, privateKey:any) {
    // use view to get wallet 
    const account = privateKeyToAccount(`0x${privateKey}`);
    // connect wallet client to Sepolia
    const deployer = createWalletClient({
        account,
        chain: sepolia,
        transport: http(`${providerApiKey}`),
    });

    // get balance
    const balance = await publicClient.getBalance({
        address: deployer.account.address,
    });

    console.log(`Deployer ${cropAddress(deployer.account.address)} connected! Balance: ${formatEther(balance)} ${deployer.chain.nativeCurrency.symbol}`);
    return deployer;
}

async function getVoterData(publicClient: any, contractAddress: `0x${string}`, voterAddress: `0x${string}`) {
    try {
        const voterData = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: "voters",
            args: [voterAddress],
        }) as any[];

        const voter = {
            weight: voterData[0],
            voted: voterData[1],
            delegate: voterData[2],
            vote: voterData[3],
        };

        console.table({
            Address: voterAddress,
            Weight: voter.weight.toString(),
            Voted: voter.voted,
            Delegate: voter.delegate,
            Vote: voter.vote.toString(),
        });

        return voter;
    } catch (error) {
        console.error(`Error reading voter data for address ${voterAddress}:`, error);
        return null;
    }
}

export { cropAddress, getWalletClient, getVoterData };