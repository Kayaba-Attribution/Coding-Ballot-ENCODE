import { viem } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";


describe("HelloWorld", function () {
    async function deployContractFixture() {
        // get client
        const publicClient = await viem.getPublicClient();
        // get wallets
        const [owner, otherAccount] = await viem.getWalletClients();
        // deploy contract
        const helloWorldContract = await viem.deployContract("HelloWorld");
        // things we will use on each test
        return {
            publicClient,
            owner,
            otherAccount,
            helloWorldContract,
        };
    }

    it("Should give a Hello World", async function () {
        const { helloWorldContract } = await loadFixture(deployContractFixture);
        const helloWorldText = await helloWorldContract.read.helloWorld();
        expect(helloWorldText).to.equal("Hello World");
    });

    it("Should set owner to deployer account", async function () {
        const { helloWorldContract, owner } = await loadFixture(
            deployContractFixture
        );
        const contractOwner = await helloWorldContract.read.owner();
        expect(contractOwner.toLowerCase()).to.equal(owner.account.address);
    });

    it("Should not allow anyone other than owner to call transferOwnership", async function () {
        const { helloWorldContract, otherAccount } = await loadFixture(
            deployContractFixture
        );
        const helloWorldContractAsOtherAccount = await viem.getContractAt(
            "HelloWorld",
            helloWorldContract.address,
            { client: { wallet: otherAccount } }
        );
        await expect(
            helloWorldContractAsOtherAccount.write.transferOwnership([
                otherAccount.account.address,
            ])
        ).to.be.rejectedWith("Caller is not the owner");
    });

    it("Should execute transferOwnership correctly", async function () {
        const { publicClient, helloWorldContract, owner, otherAccount } =
            await loadFixture(deployContractFixture);
        const txHash = await helloWorldContract.write.transferOwnership([
            otherAccount.account.address,
        ]);
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        expect(receipt.status).to.equal("success");
        const contractOwner = await helloWorldContract.read.owner();
        expect(contractOwner.toLowerCase()).to.equal(otherAccount.account.address);
        const helloWorldContractAsPreviousAccount = await viem.getContractAt(
            "HelloWorld",
            helloWorldContract.address,
            { client: { wallet: owner } }
        );
        await expect(
            helloWorldContractAsPreviousAccount.write.transferOwnership([
                owner.account.address,
            ])
        ).to.be.rejectedWith("Caller is not the owner");
    });

    it("Should not allow anyone other than owner to change text", async function () {
        const { helloWorldContract, otherAccount } =
            await loadFixture(deployContractFixture);

        // contract as other account
        const helloWorldContractAsOtherAccount = await viem.getContractAt(
            "HelloWorld",
            helloWorldContract.address,
            { client: { wallet: otherAccount } }
        );

        await expect(
            helloWorldContractAsOtherAccount.write.setText(["this should fail"])
        ).to.be.rejectedWith("Caller is not the owner");
    });

    it("Should change text correctly", async function () {
        const { publicClient, helloWorldContract, otherAccount } =
            await loadFixture(deployContractFixture);

        // owner is default 
        const txHash = await helloWorldContract.write.setText(["this should work"]);
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        expect(receipt.status).to.equal("success");

        expect(await helloWorldContract.read.helloWorld()).to.equal("this should work");
    });
});