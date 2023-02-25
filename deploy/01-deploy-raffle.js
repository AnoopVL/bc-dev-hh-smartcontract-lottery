const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helpers-hardhat-config");
//const { verify } = require("../helpers-hardhat-config");
const { verify } = require("../utils/verify");

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
    //const VRFCoordinatorV2Mock = await ethers.getContract(
    // const vrfCoordinatorV2Mock = await ethers.getContract(
    //   "VRFCoordinatorV2Mock"
    // );
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    /*++++++++++++++++++++++++++++++++ 4 ++++++++++++++++++++++++++++++++*/
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    ////----error at this line for 'yarn hh deploy'-------
    // subscriptionId = transactionReceipt.event[0].args.subId;
    subscriptionId = transactionReceipt.events[0].args.subId;
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
  //const entranceFee = networkConfig[chainId]["entraceFee"];-----entrance spelling
  const entranceFee = networkConfig[chainId]["entranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];
  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  // when we do yarn hh deploy --network goerli , we don't need the line below
  // when we do yarn hh test , we need the line below
  //  ++++++++++++++ await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  //above line is copied from github discussion

  /*++++++++++++++++++++++++++++++++ 4 ++++++++++++++++++++++++++++++++*/
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying !!!!");
    await verify(raffle.address, args);
  }
  log("----------------------------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];
