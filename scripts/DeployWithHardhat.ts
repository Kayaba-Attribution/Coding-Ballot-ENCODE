import { viem } from "hardhat";
import { toHex, hexToString, formatEther } from "viem";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function cropAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main() {

    // connect client 
    const publicClient = await viem.getPublicClient();
    const blockNumber = await publicClient.getBlockNumber();
    console.log("Last block number:", blockNumber);

    // get wallet client from sepolia on hardhat.config.ts
    const [deployer] = await viem.getWalletClients();
    console.log("Deployer address:", cropAddress(deployer.account.address));

    // get balance
    const balance = await publicClient.getBalance({
        address: deployer.account.address,
    });

    console.log(
        "Deployer balance:",
        formatEther(balance),
        deployer.chain.nativeCurrency.symbol
    );

    /*
        ❯ npx hardhat run ./scripts/DeployWithHardhat.ts --network sepolia
        Last block number: 6505964n
        Deployer address: 0x7774...3280
        Deployer balance: 0.145897863175809 ETH
    */


    console.log("\nDeploying Ballot contract");
    const ballotContract = await viem.deployContract("Ballot", [
        PROPOSALS.map((prop) => toHex(prop, { size: 32 })),
    ]);

    console.log("Ballot contract deployed to:", ballotContract.address);

    console.log("Proposals: ");
    for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.read.proposals([BigInt(index)]);
        const name = hexToString(proposal[0], { size: 32 });
        console.table({ index, name, proposal });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});