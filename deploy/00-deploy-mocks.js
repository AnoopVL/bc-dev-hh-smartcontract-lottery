/*++++++++++++++++++++++++++++++++ 1 ++++++++++++++++++++++++++++++++*/
const { deploymentChains } = require("../../helpers-hardhat-config");
const { developmentChains } = require("../helpers-hardhat-config");
const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helpers-hardhat-config");
const { verify } = require("../helpers-hardhat-config");

//const { network } = require("hardhat");

/*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/
//this is the premium(gas fee) needed to enter
const BASE_FEE = ethers.utils.parseEther("0.25");
//Eth price is somewhat $1500
//Chainlink nodes pay the gas fees to give us randomness and do external execution
//SO they price of requests change based on the price of gas
const GAS_PRICE_LINK = 1e9; //link per gas. calulate value based on the gas price of the chain.
const args = [BASE_FEE, GAS_PRICE_LINK];

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  //const chainId = network.config.chainId;
  const chainId = network.name;
  //Error: ERROR processing /home/anoop/hh-fcc/hardhat-smartcontract-lottery/deploy/00-deploy-mocks.js:
  //TypeError: Cannot read properties of undefined (reading 'includes')
  if (deploymentChains.includes(network.name)) {
    log("Local network detected !! Deploying mocks...");
    //now we have to deploy a mock vrfcoordinator...
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args,
    });
    log("Mocks is deployed !!");
    log("-------------------------------------------------------------------");
  }
};

// deploy function continued

module.exports.tags = ["all", "mocks"];
