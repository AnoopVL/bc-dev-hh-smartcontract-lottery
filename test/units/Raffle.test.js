const { network, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helpers-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", async function () {
      let raffle, vrfCoordinatorV2Mock;
      beforeEach(async function () {
        const { deployer } = await getNamedAccounts();
      });
    });
