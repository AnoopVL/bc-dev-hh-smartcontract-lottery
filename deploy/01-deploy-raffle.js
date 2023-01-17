const { network } = require("hardhat");

/*++++++++++++++++++++++++++++++++ 1 ++++++++++++++++++++++++++++++++*/
module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmation || 1,
  });
};
