const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helpers-hardhat-config");
/*++++++++++++++++++++++++++++++++ 4 ++++++++++++++++++++++++++++++++*/
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("20");
/*++++++++++++++++++++++++++++++++ 1 ++++++++++++++++++++++++++++++++*/
module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  /*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/
  let vrfCoordinatorV2Address, subscriptionId;
  /*++++++++++++++++++++++++++++++++ 3 ++++++++++++++++++++++++++++++++*/
  const chainId = network.config.chainId;
  /*++++++++++++++++++++++++++++++++ 2 ++++++++++++++++++++++++++++++++*/

  if (developmentChains.includes(network.name)) {
    const VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    /*++++++++++++++++++++++++++++++++ 4 ++++++++++++++++++++++++++++++++*/
    const transactionResponse = await VRFCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.event[0].args.subId;
    //after we create the subscriptionId we have to fund it
    // on real network we would need the 'link token'
    // but on this mock we wont need the link token
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  /*++++++++++++++++++++++++++++++++ 3 ++++++++++++++++++++++++++++++++*/
  const entranceFee = networkConfig[chainId]["entraceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    subscriptionId,
    callbackGasLimit,
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmation || 1,
  });
};
