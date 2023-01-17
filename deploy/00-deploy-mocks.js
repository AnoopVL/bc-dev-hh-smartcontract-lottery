/*++++++++++++++++++++++++++++++++ 1 ++++++++++++++++++++++++++++++++*/
const { deploymentChains } = require("../helpers-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  if (deploymentChains.includes(network.name)) {
    log("Local network detected !! Deploying mocks...");
    //now we have to deploy a mock vrfcoordinator...
  }
};
