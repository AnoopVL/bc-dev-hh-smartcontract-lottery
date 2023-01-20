const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helpers-hardhat-config");

/*++++++++++++++++++++++++++++++++ 1 ++++++++++++++++++++++++++++++++*/
module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  /*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/
  let vrfCoordinatorV2Address;
  /*++++++++++++++++++++++++++++++++ 3 ++++++++++++++++++++++++++++++++*/
  const chainID = network.config.chainId;
  /*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/

  if (developmentChains.includes(network.name)) {
    const VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
  } else {
    vrfCoordinatorV2Address = networkConfig[chainID]["vrfCoordinatorV2"];
  }

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmation || 1,
  });
};
