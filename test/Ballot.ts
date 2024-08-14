import { expect } from "chai";
import { toHex, hexToString } from "viem";
import { viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

async function deployContract() {
    // get client
    const publicClient = await viem.getPublicClient();
    // get wallets
    const [chairperson, voter_1, voter_2, voter_3, voter_4, voter_5] = await viem.getWalletClients();
    // deploy contract
    const ballotContract = await viem.deployContract("Ballot",
        [PROPOSALS.map((p) => toHex(p, { size: 32 }))],
    );
    // things we will use on each test
    return {
        publicClient,
        chairperson,
        voter_1,
        voter_2,
        voter_3,
        voter_4,
        voter_5,
        ballotContract,
    };
}

async function getVoterContract(voter: any, contractAddress: any) {
    return await viem.getContractAt(
        "Ballot",
        contractAddress,
        { client: { wallet: voter } }
    );
}


describe("Ballot", async () => {
    describe("when the contract is deployed", async () => {
        it("has the provided proposals", async () => {
            const { ballotContract } = await loadFixture(deployContract);

            for (let index = 0; index < PROPOSALS.length; index++) {
                // read proposal, check by using loc 0 bytes32 name and converting hex to string
                const proposal = await ballotContract.read.proposals([BigInt(index)]);
                expect(hexToString(proposal[0], { size: 32 })).to.eq(PROPOSALS[index]);
            }
        });

        it("has zero votes for all proposals", async () => {
            const { ballotContract } = await loadFixture(deployContract);
            for (let index = 0; index < PROPOSALS.length; index++) {
                // read proposal, check by using loc 1 uint voteCount and converting to BigInt
                const proposal = await ballotContract.read.proposals([BigInt(index)]);
                expect(proposal[1]).to.eq(BigInt(0));
            }
        });
        it("sets the deployer address as chairperson", async () => {
            const { ballotContract, chairperson } = await loadFixture(deployContract);
            // read chairperson
            const ballotChairperson = await ballotContract.read.chairperson();
            expect(ballotChairperson.toLowerCase()).to.eq(chairperson.account.address.toLowerCase());
        });
        it("sets the voting weight for the chairperson as 1", async () => {
            const { ballotContract, chairperson } = await loadFixture(deployContract);
            // read voters struct for chairperson access uint weight
            const voterStruct = await ballotContract.read.voters([chairperson.account.address]);
            expect(voterStruct[0]).to.eq(BigInt(1));
        });
    });

    describe("when the chairperson interacts with the giveRightToVote function in the contract", async () => {
        it("gives right to vote for another address", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);
            // give right to vote to voter_1
            const txHash = await ballotContract.write.giveRightToVote([voter_1.account.address]);
            // check if the voter_1 has right to vote
            const voterStruct = await ballotContract.read.voters([voter_1.account.address]);
            expect(voterStruct[0]).to.eq(BigInt(1));
        });
        it("can not give right to vote for someone that has voted", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);
            // give right to vote to voter_1
            await ballotContract.write.giveRightToVote([voter_1.account.address]);

            // connect and make voter_1 vote
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            const txHash2 = await voterBallot.write.vote([BigInt(0)]);

            // re-give right to vote should revert
            await expect(ballotContract.write.giveRightToVote([voter_1.account.address])).to.be.rejectedWith("The voter already voted.");

        });
        it("can not give right to vote for someone that has already voting rights", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);
            // give right to vote to voter_1
            await ballotContract.write.giveRightToVote([voter_1.account.address]);

            // re-give right to vote should revert
            await expect(ballotContract.write.giveRightToVote([voter_1.account.address])).to.be.rejectedWith("Transaction reverted without a reason string");
        });
    });

    describe("when the voter interacts with the vote function in the contract", async () => {
        it("should register the vote", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);
            // give voter_1 right to vote
            await ballotContract.write.giveRightToVote([voter_1.account.address]);

            // vote for proposal 0
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            await voterBallot.write.vote([BigInt(0)]);

            // load struct
            const voterStruct = await ballotContract.read.voters([voter_1.account.address]);

            // check if the vote was registered
            expect(voterStruct[0]).to.eq(BigInt(1));
        });
    });

    describe("when the voter interacts with the delegate function in the contract", async () => {
        it("should transfer voting power", async () => {
            const { ballotContract, voter_1, voter_2 } = await loadFixture(deployContract);
            // give voter_1 right to vote
            // NOTE: voter_2 needs to have the right to vote to delegate:
            /**
             *   Line 107: delegate
             *   // Voters cannot delegate to accounts that cannot vote.
             *   require(delegate_.weight >= 1);
             */
            await ballotContract.write.giveRightToVote([voter_1.account.address]);
            await ballotContract.write.giveRightToVote([voter_2.account.address]);

            // voter_1 transfer right to voter_2
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            await voterBallot.write.delegate([voter_2.account.address]);

            // check voter_2 weight 2
            const voterStruct_2 = await ballotContract.read.voters([voter_2.account.address]);
            expect(voterStruct_2[0]).to.eq(BigInt(2));

            // check voter_1 voted already (delegate counts as a vote)
            const voterStruct_1 = await ballotContract.read.voters([voter_1.account.address]);
            expect(voterStruct_1[1]).to.eq(true);

        });
    });

    describe("when an account other than the chairperson interacts with the giveRightToVote function in the contract", async () => {
        it("should revert", async () => {
            const { ballotContract, voter_1, voter_2 } = await loadFixture(deployContract);

            // use voter_1 to give voting rights to voter_2 should revert
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            expect(voterBallot.write.giveRightToVote([voter_2.account.address])).to.be.rejectedWith("Only chairperson can give right to vote.");
        });
    });

    describe("when an account without right to vote interacts with the vote function in the contract", async () => {
        it("should revert", async () => {
            const { ballotContract, voter_1, voter_2 } = await loadFixture(deployContract);

            // use voter_1 to try to vote without right to vote should revert
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            expect(voterBallot.write.vote([BigInt(0)])).to.be.rejectedWith("Has no right to vote");
        });
    });

    describe("when an account without right to vote interacts with the delegate function in the contract", async () => {
        it("should revert", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);

            // use voter_1 to try to delegate without right to vote should revert
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            expect(voterBallot.write.delegate([voter_1.account.address])).to.be.rejectedWith("You have no right to vote");
        });
    });

    describe("when someone interacts with the winningProposal function before any votes are cast", async () => {
        it("should return 0", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);
            // ! if winningProposal_ is not init, solidity will return 0
            // use voter_1 to try to call winningProposal without right to vote should revert
            const voterBallot = await getVoterContract(voter_1, ballotContract.address);
            expect(await voterBallot.read.winningProposal()).to.be.equal(BigInt(0));
        });
    });

    describe("when someone interacts with the winningProposal function after one vote is cast for the first proposal", async () => {
        it("should return 0", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);

            // owner votes for the first proposal
            await ballotContract.write.vote([BigInt(0)]);

            // check proposal 1 votes
            const proposal = await ballotContract.read.proposals([BigInt(0)]);
            expect(proposal[1]).to.eq(BigInt(1));

            // winningProposal should be 0 as is the only one with votes
            expect(await ballotContract.read.winningProposal()).to.be.equal(BigInt(0));
        });
    });

    describe("when someone interacts with the winnerName function before any votes are cast", async () => {
        it("should return name of proposal 0", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);
            const result = await ballotContract.read.winnerName();

            // winningProposal should be 0 
            expect(hexToString(result, { size: 32 })).to.eq(PROPOSALS[0]);
        });
    });

    describe("when someone interacts with the winnerName function after one vote is cast for the first proposal", async () => {

        it("should return name of proposal 0", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);

            // owner votes for the first proposal
            await ballotContract.write.vote([BigInt(0)]);

            // check proposal 1 votes
            const proposal = await ballotContract.read.proposals([BigInt(0)]);
            expect(proposal[1]).to.eq(BigInt(1));

            // wining one should be proposal 0
            const result = await ballotContract.read.winnerName();
            expect(hexToString(result, { size: 32 })).to.eq(PROPOSALS[0]);
        });
    });

    describe("when someone interacts with the winnerName function after one vote is cast for the seconf proposal", async () => {

        it("should return name of proposal 1", async () => {
            const { ballotContract, voter_1 } = await loadFixture(deployContract);

            // owner votes for the first proposal
            await ballotContract.write.vote([BigInt(1)]);

            // check proposal 1 votes
            const proposal = await ballotContract.read.proposals([BigInt(1)]);
            expect(proposal[1]).to.eq(BigInt(1));

            // wining one should be proposal 0
            const result = await ballotContract.read.winnerName();
            expect(hexToString(result, { size: 32 })).to.eq(PROPOSALS[1]);
        });
    });

    describe("when someone interacts with the winningProposal function and winnerName after 5 random votes are cast for the proposals", async () => {

        it("should return the name of the winner proposal", async () => {
            const { ballotContract,
                voter_1,
                voter_2,
                voter_3,
                voter_4,
                voter_5
            } = await loadFixture(deployContract);

            const VOTERS = [voter_1, voter_2, voter_3, voter_4, voter_5];

            function getRandomInt(max: number) {
                return Math.floor(Math.random() * max);
            }


            for (let i = 0; i < 5; i++) {
                // give right to vote
                await ballotContract.write.giveRightToVote([VOTERS[i].account.address]);

                // voter contract
                const voterBallot = await getVoterContract(VOTERS[i], ballotContract.address);

                // vote randomly
                await voterBallot.write.vote([BigInt(getRandomInt(3))]);
            }

            for (let index = 0; index < PROPOSALS.length; index++) {
                // read proposal, check by using loc 0 bytes32 name and converting hex to string
                const proposal = await ballotContract.read.proposals([BigInt(index)]);
                console.log(`Proposal ${PROPOSALS[index]} has ${proposal[1]} votes`);
            }

            // check winner
            const result = await ballotContract.read.winnerName();
            console.log(`Winner is ${hexToString(result, { size: 32 })}`);
        });
    });
});