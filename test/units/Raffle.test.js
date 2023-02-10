const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  isCallTrace,
} = require("hardhat/internal/hardhat-network/stack-traces/message-trace");
const {
  developmentChains,
  networkConfig,
} = require("../../helpers-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval;
      const chainId = networkConfig.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });
      describe("constructor", function () {
        it("Initailizes the raffle correctly", async function () {
          // Usually in our tests we have just 1 assert per "it" function
          const raffleState = await raffle.getRaffleState();
          //interval already declared in describe and beforeEach
          //const interval = await raffle.getInterval();
          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chianId]["interval"]);
        });
      });
      describe("enterRaffle", function () {
        it("reverts when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle_NotEnoughETHEntered"
          );
        });
        it("records players when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });
        it("emmits events on enter", async function () {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "RaffleEnter");
        });
        it("it doesnt allow entrance when raffle is caluculating !!", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpKeep([]);
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith("raffle_NotOpen");
        });
        ///continued
      });
      describe("checkUpKeep", function () {
        it("returns false if people haven't sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upKeepNeeded } = await raffle.callStatic.checkUpKeep([]);
          assert(!upKeepNeeded);
        });
        it("returns false if raffle is not open !!", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpKeep("0x");
          const { upKeepNeeded } = await raffle.callStatic.checkUpKeep([]);
          assert.equal(raffleState.toString(), "1");
          assert.equal(performUpKeep, false);
        });
        //.....copied from github repo....
        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 5,
          ]); // use a higher number here if this test fails
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(upkeepNeeded);
          //....copied from github repo.... ^^^^
        });
      });
      describe("performUpKeep", function () {
        it("This runs only if checkupkeep is true", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpKeep([]);
          assert(tx);
        });
        it("reverts when checkupkeep is false", async function () {
          await expect(raffle.performUpKeep([])).to.be.revertedWith(
            "Raffle_UpkeepNotNeeded"
          );
        });
        it("Reverts the raffle state, emits and event, and calls the vrf coordinator", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await raffle.performUpKeep([]);
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events(1).args.requestId;
          const raffleState = await raffle.getRaffleState();
          assert(requestId.toNumber() > 0);
          assert(raffleState.toString() == 1);
        });
      });
      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });
        it("can only be called after performupkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
          ).to.be.revertedWith("nonexistent request");
        });
        it("picks a winner, resets the lottery, sends money", async function () {
          const additionalEntrances = 3;
          const startingAccountIndex = 1;
          const accounts = await ethers.getSigners();
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrances;
            i++
          ) {
            const accountConnectedRaffle = raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({
              value: raffleEntranceFee,
            });
          }
          const startingTimeStamp = await raffle.getLastTimeStamp();
          // performUpKeep (mock being chianlink keepers)
          //fulfillrandomWords(mock being chainlink VRF)
          //We will have to wait for fulfillRandomWords to be called
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("Found the event !!");
              try {
                console.log(recentWinner);
                console.log(accounts[2]);
                console.log(accounts[0]);
                console.log(accounts[1]);
                console.log(accounts[3]);
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                assert.equal(numPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);
              } catch (e) {
                reject(e);
              }
              resolve();
            });
            //setting up the listener
            // below, we will fire the event, and the listener will pick it up, and resolve
            const tx = await raffle.performUpKeep([]);
            const txReceipt = await tx.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            );
          });
        });
      });
    });
