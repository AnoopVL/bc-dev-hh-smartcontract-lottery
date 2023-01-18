const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helpers-hardhat-config");

/*++++++++++++++++++++++++++++++++ 1 ++++++++++++++++++++++++++++++++*/
module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  /*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/
  let vrfCoordinatorV2Address;

  /*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/
  if (developmentChains.includes(network.name)) {
    const VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
  }

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmation || 1,
  });
};
