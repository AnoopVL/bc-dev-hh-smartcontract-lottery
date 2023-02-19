// const { assert, expect } = require("chai");
// const { network, deployments, ethers } = require("hardhat");
// const {
//   developmentChains,
//   networkConfig,
// } = require("../helpers-hardhat-config");

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
      let raffle,
        raffleContract,
        vrfCoordinatorV2Mock,
        raffleEntranceFee,
        interval,
        player; // , deployer

      beforeEach(async () => {
        accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        //   deployer = accounts[0]
        player = accounts[1];
        await deployments.fixture(["mocks", "raffle"]); // Deploys modules with the tags "mocks" and "raffle"
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock"); // Returns a new connection to the VRFCoordinatorV2Mock contract
        raffleContract = await ethers.getContract("Raffle"); // Returns a new connection to the Raffle contract
        raffle = raffleContract.connect(player); // Returns a new instance of the Raffle contract connected to player
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe("constructor", function () {
        // not running, to be checked
        it("initializes the raffle correctly", async () => {
          // Ideally, we'd separate these out so that only 1 assert per "it" block
          // And ideally, we'd make this check everything
          const raffleState = (await raffle.getRaffleState()).toString();
          // Comparisons for Raffle initialization:
          assert.equal(raffleState, "0");
          assert.equal(
            interval.toString(),
            networkConfig[network.config.chainId]["keepersUpdateInterval"]
          );
        });
      });

      describe("enterRaffle", function () {
        // running
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            // is reverted when not paid enough or raffle is not open
            //"Raffle__SendMoreToEnterRaffle"
            "Raffle_NotEnoughETHEntered"
          );
        });

        //running
        it("records player when they enter", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const contractPlayer = await raffle.getPlayer(0);
          assert.equal(player.address, contractPlayer);
        });
        //running
        it("emits event on enter", async () => {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(
            // emits RaffleEnter event if entered to index player(s) address
            raffle,
            "RaffleEnter"
          );
        });
        // not running, to be checked later
        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          // we pretend to be a keeper for a second
          await raffle.performUpkeep([]); // changes the state to calculating for our comparison below
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith(
            // is reverted as raffle is calculating
            "Raffle__RaffleNotOpen"
          );
        });
      });
      describe("checkUpkeep", function () {
        it("returns false if people haven't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upkeepNeeded);
        });
        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await raffle.performUpkeep([]); // changes the state to calculating
          const raffleState = await raffle.getRaffleState(); // stores the new state
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert.equal(raffleState.toString() == "1", upkeepNeeded == false);
        });
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
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await raffle.performUpkeep("0x");
          assert(tx);
        });
        it("reverts if checkup is false", async () => {
          await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
            "Raffle__UpkeepNotNeeded"
          );
        });
        it("updates the raffle state and emits a requestId", async () => {
          // Too many asserts in this test!
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const txResponse = await raffle.performUpkeep("0x"); // emits requestId
          const txReceipt = await txResponse.wait(1); // waits 1 block
          const raffleState = await raffle.getRaffleState(); // updates state
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
          assert(raffleState == 1); // 0 = open, 1 = calculating
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

        // This test is too big...
        // This test simulates users entering the raffle and wraps the entire functionality of the raffle
        // inside a promise that will resolve if everything is successful.
        // An event listener for the WinnerPicked is set up
        // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
        // All the assertions are done once the WinnerPicked event is fired
        it("picks a winner, resets, and sends money", async () => {
          const additionalEntrances = 3; // to test
          const startingIndex = 2;
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrances;
            i++
          ) {
            // i = 2; i < 5; i=i+1
            raffle = raffleContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
            await raffle.enterRaffle({ value: raffleEntranceFee });
          }
          const startingTimeStamp = await raffle.getLastTimeStamp(); // stores starting timestamp (before we fire our event)

          // This will be more important for our staging tests...
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              // event listener for WinnerPicked
              console.log("WinnerPicked event fired!");
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              try {
                // Now lets get the ending values...
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await accounts[2].getBalance();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                // Comparisons to check if our ending values are correct:
                assert.equal(recentWinner.toString(), accounts[2].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    .add(
                      raffleEntranceFee
                        .mul(additionalEntrances)
                        .add(raffleEntranceFee)
                    )
                    .toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve(); // if try passes, resolves the promise
              } catch (e) {
                reject(e); // if try fails, rejects the promise
              }
            });

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            const tx = await raffle.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const startingBalance = await accounts[2].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            );
          });
        });
      });
    });
// Footer;

/**--------------------my code ----------------------------- */

// const { assert, expect } = require("chai");
// const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
// const {
//   isCallTrace,
// } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");
// const {
//   developmentChains,
//   networkConfig,
// } = require("../../helpers-hardhat-config");

// !developmentChains.includes(network.name)
//   ? describe.skip
//   : describe("Raffle Unit Tests", function () {
//       //describe("Raffle Unit Tests", function () {
//       let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval;
//       const chainId = networkConfig.chainId;
//       beforeEach(async function () {
//         deployer = (await getNamedAccounts()).deployer;
//         await deployments.fixture(["all"]);
//         raffle = await ethers.getContract("Raffle", deployer);
//         vrfCoordinatorV2Mock = await ethers.getContract(
//           "VRFCoordinatorV2Mock",
//           deployer
//         );
//         raffleEntranceFee = await raffle.getEntranceFee();
//         interval = await raffle.getInterval();
//       });
//       describe("constructor", function () {
//         it("Initailizes the raffle correctly", async function () {
//           // Usually in our tests we have just 1 assert per "it" function
//           const raffleState = await raffle.getRaffleState();
//           //interval already declared in describe and beforeEach
//           //const interval = await raffle.getInterval();
//           assert.equal(raffleState.toString(), "0");
//           assert.equal(interval.toString(), networkConfig[chianId]["interval"]);
//         });
//       });
//       describe("enterRaffle", function () {
//         it("reverts when you don't pay enough", async function () {
//           await expect(raffle.enterRaffle()).to.be.revertedWith(
//             "Raffle_NotEnoughETHEntered"
//           );
//         });
//         it("records players when they enter", async function () {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           const playerFromContract = await raffle.getPlayer(0);
//           assert.equal(playerFromContract, deployer);
//         });
//         it("emmits events on enter", async function () {
//           await expect(
//             raffle.enterRaffle({ value: raffleEntranceFee })
//           ).to.emit(raffle, "RaffleEnter");
//         });
//         it("it doesnt allow entrance when raffle is caluculating !!", async function () {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.send("evm_mine", []);
//           await raffle.performUpKeep([]);
//           await expect(
//             raffle.enterRaffle({ value: raffleEntranceFee })
//           ).to.be.revertedWith("raffle_NotOpen");
//         });
//         ///continued
//       });
//       describe("checkUpKeep", function () {
//         it("returns false if people haven't sent any ETH", async function () {
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.send("evm_mine", []);
//           const { upKeepNeeded } = await raffle.callStatic.checkUpKeep([]);
//           assert(!upKeepNeeded);
//         });
//         it("returns false if raffle is not open !!", async function () {
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.send("evm_mine", []);
//           await raffle.performUpKeep("0x");
//           const { upKeepNeeded } = await raffle.callStatic.checkUpKeep([]);
//           assert.equal(raffleState.toString(), "1");
//           assert.equal(performUpKeep, false);
//         });
//         //.....copied from github repo....
//         it("returns false if enough time hasn't passed", async () => {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() - 5,
//           ]); // use a higher number here if this test fails
//           await network.provider.request({ method: "evm_mine", params: [] });
//           const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
//           assert(!upkeepNeeded);
//         });
//         it("returns true if enough time has passed, has players, eth, and is open", async () => {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.request({ method: "evm_mine", params: [] });
//           const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
//           assert(upkeepNeeded);
//           //....copied from github repo.... ^^^^
//         });
//       });
//       describe("performUpKeep", function () {
//         // it("This runs only if checkupkeep is true", async function () {
//         //   await raffle.enterRaffle({ value: raffleEntranceFee });
//         //   await network.provider.send("evm_increaseTime", [
//         //     interval.toNumber() + 1,
//         //   ]);
//         //   await network.provider.send("evm_mine", []);
//         //   const tx = await raffle.performUpKeep([]);
//         //   assert(tx);
//         // });
//         it("can only run if checkupkeep is true", async () => {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.request({ method: "evm_mine", params: [] });
//           const tx = await raffle.performUpkeep("0x");
//           assert(tx);
//         });
//         it("reverts when checkupkeep is false", async function () {
//           await expect(raffle.performUpKeep([])).to.be.revertedWith(
//             "Raffle_UpkeepNotNeeded"
//           );
//         });
//         it("Reverts the raffle state, emits and event, and calls the vrf coordinator", async function () {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.send("evm_mine", []);
//           const txResponse = await raffle.performUpKeep([]);
//           const txReceipt = await txResponse.wait(1);
//           const requestId = txReceipt.events(1).args.requestId;
//           const raffleState = await raffle.getRaffleState();
//           assert(requestId.toNumber() > 0);
//           assert(raffleState.toString() == 1);
//         });
//       });
//       describe("fulfillRandomWords", function () {
//         beforeEach(async () => {
//           await raffle.enterRaffle({ value: raffleEntranceFee });
//           await network.provider.send("evm_increaseTime", [
//             interval.toNumber() + 1,
//           ]);
//           await network.provider.request({ method: "evm_mine", params: [] });
//         });
//         it("can only be called after performupkeep", async () => {
//           await expect(
//             vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
//           ).to.be.revertedWith("nonexistent request");
//           await expect(
//             vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
//           ).to.be.revertedWith("nonexistent request");
//         });
//         it("picks a winner, resets the lottery, sends money", async function () {
//           const additionalEntrances = 3;
//           const startingAccountIndex = 1;
//           const accounts = await ethers.getSigners();
//           for (
//             let i = startingAccountIndex;
//             i < startingAccountIndex + additionalEntrances;
//             i++
//           ) {
//             const accountConnectedRaffle = raffle.connect(accounts[i]);
//             await accountConnectedRaffle.enterRaffle({
//               value: raffleEntranceFee,
//             });
//           }
//           const startingTimeStamp = await raffle.getLatestTimeStamp();
//           // performUpKeep (mock being chianlink keepers)
//           //fulfillrandomWords(mock being chainlink VRF)
//           //We will have to wait for fulfillRandomWords to be called
//           // yet to run
//           await new Promise(async (resolve, reject) => {
//             raffle.once("WinnerPicked", async () => {
//               console.log("Found the event !!");
//               try {
//                 console.log(recentWinner);
//                 console.log(accounts[2].address);
//                 console.log(accounts[0].address);
//                 console.log(accounts[1].address);
//                 console.log(accounts[3].address);
//                 const recentWinner = await raffle.getRecentWinner();
//                 const raffleState = await raffle.getRaffleState();
//                 const endingTimeStamp = await raffle.getLatestTimeStamp();
//                 const numPlayers = await raffle.getNumberOfPlayers();
//                 assert.equal(numPlayers.toString(), "0");
//                 assert.equal(raffleState.toString(), "0");
//                 assert(endingTimeStamp > startingTimeStamp);
//                 //This means that winner should endup with all the money that everybody else added
//                 assert.equal(
//                   winnerEndingBalance.toString(),
//                   winnerStartingBalance.add(
//                     raffleEntranceFee
//                       .mul(additionalEntrances)
//                       .add(raffleEntranceFee)
//                       .toString()
//                   )
//                 );
//               } catch (e) {
//                 reject(e);
//               }
//               resolve();
//             });
//             //setting up the listener
//             // below, we will fire the event, and the listener will pick it up, and resolve
//             const tx = await raffle.performUpKeep([]);
//             const txReceipt = await tx.wait(1);
//             // const winnerStartingBalance = await accounts[1].getBalance();
//             await vrfCoordinatorV2Mock.fulfillRandomWords(
//               txReceipt.events[1].args.requestId,
//               raffle.address
//             );
//           });
//         });
//       });
//     });
