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
      //const chainId = networkConfig.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        //await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        // vrfCoordinatorV2Mock = await ethers.getContract(
        //   "VRFCoordinatorV2Mock",
        //   deployer
        // );
        raffleEntranceFee = await raffle.getEntranceFee();
        //interval = await raffle.getInterval();
      });
      describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get random winner", async function () {
          // here we are trying to enter raffle
          const startingTimeStamp = await raffle.getLatestTimeStamp();

          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired");
              resolve();
              try {
                //yet to add asserts in this section
              } catch (error) {
                console.log(error);
                reject(e);
              }
            });

            await raffle.enterRaffle({ value: raffleEntranceFee });
          });
        });
      });
    });
