import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
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

export { cropAddress, getWalletClient };