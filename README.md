# Coding-Ballot Notes

### Useful Pieces VIEM

+ get deployer wallet client

```typescript
async function getDeployerWalletClient(publicClient: any) {
    // use view to get wallet 
    const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
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
```

+ Public client 
```typescript
    // connect public client
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(`${providerApiKey}`),
    });

    // check connection using getBlockNumber
    const blockNumber = await publicClient.getBlockNumber();
    console.log("Last block number:", blockNumber);
```

+ Deploy contract 
```typescript
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
    // deploy, pass contract ABI, bytecode and args
    const hash = await deployer.deployContract({
        abi,
        bytecode: bytecode as `0x${string}`,
        args: [proposals.map((prop) => toHex(prop, { size: 32 }))],
    })
    // wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Ballot contract deployed to:", receipt.contractAddress)
    // type check for CA
    if (!receipt.contractAddress) {
        console.log("Contract deployment failed");
        return;
    }

```



### Useful Pieces MOCHA

+ deploy and attach
```typescript
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
```

+ kinda complex test
```typescript
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
```

+ revert
```typescript

it("should revert", async () => {
    const { ballotContract, voter_1 } = await loadFixture(deployContract)
    // use voter_1 to try to delegate without right to vote should revert
    const voterBallot = await getVoterContract(voter_1, ballotContract.address);
    expect(voterBallot.write.delegate([voter_1.account.address])).to.be.rejectedWith("You have no right to vote");
});

// also like this (other test)
// https://github.com/Encode-Club-Solidity-Bootcamp/Lesson-07/issues/44
expect(ballotContract.write.giveRightToVote([voter_1.account.address])).to.be.rejected;`

```

### Mocha Tests
```bash
❯ npm run test

> test
> npx hardhat test
  Ballot
    when the contract is deployed
      ✔ has the provided proposals (685ms)
      ✔ has zero votes for all proposals
      ✔ sets the deployer address as chairperson
      ✔ sets the voting weight for the chairperson as 1
    when the chairperson interacts with the giveRightToVote function in the contract
      ✔ gives right to vote for another address
      ✔ can not give right to vote for someone that has voted
      ✔ can not give right to vote for someone that has already voting rights
    when the voter interacts with the vote function in the contract
      ✔ should register the vote
    when the voter interacts with the delegate function in the contract
      ✔ should transfer voting power
    when an account other than the chairperson interacts with the giveRightToVote function in the contract
      ✔ should revert
    when an account without right to vote interacts with the vote function in the contract
      ✔ should revert
    when an account without right to vote interacts with the delegate function in the contract
      ✔ should revert
    when someone interacts with the winningProposal function before any votes are cast
      ✔ should return 0
    when someone interacts with the winningProposal function after one vote is cast for the first proposal
      ✔ should return 0
    when someone interacts with the winnerName function before any votes are cast
      ✔ should return name of proposal 0
    when someone interacts with the winnerName function after one vote is cast for the first proposal
      ✔ should return name of proposal 0
    when someone interacts with the winnerName function after one vote is cast for the seconf proposal
      ✔ should return name of proposal 1
    when someone interacts with the winningProposal function and winnerName after 5 random votes are cast for the proposals
Proposal Proposal 1 has 1 votes
Proposal Proposal 2 has 2 votes
Proposal Proposal 3 has 2 votes
Winner is Proposal 2
      ✔ should return the name of the winner proposal

  HelloWorld
    ✔ Should give a Hello World
    ✔ Should set owner to deployer account
    ✔ Should not allow anyone other than owner to call transferOwnership
    ✔ Should execute transferOwnership correctly
    ✔ Should not allow anyone other than owner to change text
    ✔ Should change text correctly


  24 passing (821ms)
```


### Contract 

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
/// @title Voting with delegation.
contract Ballot {
    // This declares a new complex type which will
    // be used for variables later.
    // It will represent a single voter.
    struct Voter {
        uint weight; // weight is accumulated by delegation
        bool voted;  // if true, that person already voted
        address delegate; // person delegated to
        uint vote;   // index of the voted proposal
    }

    // This is a type for a single proposal.
    struct Proposal {
        bytes32 name;   // short name (up to 32 bytes)
        uint voteCount; // number of accumulated votes
    }

    address public chairperson;

    // This declares a state variable that
    // stores a `Voter` struct for each possible address.
    mapping(address => Voter) public voters;

    // A dynamically-sized array of `Proposal` structs.
    Proposal[] public proposals;

    /// Create a new ballot to choose one of `proposalNames`.
    constructor(bytes32[] memory proposalNames) {
        chairperson = msg.sender;
        voters[chairperson].weight = 1;

        // For each of the provided proposal names,
        // create a new proposal object and add it
        // to the end of the array.
        for (uint i = 0; i < proposalNames.length; i++) {
            // `Proposal({...})` creates a temporary
            // Proposal object and `proposals.push(...)`
            // appends it to the end of `proposals`.
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));
        }
    }

    function getProposal(uint index) external view returns (bytes32 name, uint voteCount) {
        name = proposals[index].name;
        voteCount = proposals[index].voteCount;

        return (name, voteCount);
    }

    // Give `voter` the right to vote on this ballot.
    // May only be called by `chairperson`.
    function giveRightToVote(address voter) external {
        // If the first argument of `require` evaluates
        // to `false`, execution terminates and all
        // changes to the state and to Ether balances
        // are reverted.
        // This used to consume all gas in old EVM versions, but
        // not anymore.
        // It is often a good idea to use `require` to check if
        // functions are called correctly.
        // As a second argument, you can also provide an
        // explanation about what went wrong.
        require(
            msg.sender == chairperson,
            "Only chairperson can give right to vote."
        );
        require(
            !voters[voter].voted,
            "The voter already voted."
        );
        require(voters[voter].weight == 0);
        voters[voter].weight = 1;
    }

    /// Delegate your vote to the voter `to`.
    function delegate(address to) external {
        // assigns reference
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "You have no right to vote");
        require(!sender.voted, "You already voted.");

        require(to != msg.sender, "Self-delegation is disallowed.");

        // Forward the delegation as long as
        // `to` also delegated.
        // In general, such loops are very dangerous,
        // because if they run too long, they might
        // need more gas than is available in a block.
        // In this case, the delegation will not be executed,
        // but in other situations, such loops might
        // cause a contract to get "stuck" completely.
        while (voters[to].delegate != address(0)) {
            to = voters[to].delegate;

            // We found a loop in the delegation, not allowed.
            require(to != msg.sender, "Found loop in delegation.");
        }

        Voter storage delegate_ = voters[to];

        // Voters cannot delegate to accounts that cannot vote.
        require(delegate_.weight >= 1);

        // Since `sender` is a reference, this
        // modifies `voters[msg.sender]`.
        sender.voted = true;
        sender.delegate = to;

        if (delegate_.voted) {
            // If the delegate already voted,
            // directly add to the number of votes
            proposals[delegate_.vote].voteCount += sender.weight;
        } else {
            // If the delegate did not vote yet,
            // add to her weight.
            delegate_.weight += sender.weight;
        }
    }

    /// Give your vote (including votes delegated to you)
    /// to proposal `proposals[proposal].name`.
    function vote(uint proposal) external {
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "Has no right to vote");
        require(!sender.voted, "Already voted.");
        sender.voted = true;
        sender.vote = proposal;

        // If `proposal` is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        proposals[proposal].voteCount += sender.weight;
    }

    /// @dev Computes the winning proposal taking all
    /// previous votes into account.
    function winningProposal() public view
            returns (uint winningProposal_)
    {
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    // Calls winningProposal() function to get the index
    // of the winner contained in the proposals array and then
    // returns the name of the winner
    function winnerName() external view
            returns (bytes32 winnerName_)
    {
        winnerName_ = proposals[winningProposal()].name;
    }
}
```