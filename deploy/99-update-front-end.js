const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
  "/home/anoop/hh-fcc/nextjs-smartcontract-lottery/constants/contractAddresses.json";
const FRONT_END_ABI_FILE =
  "/home/anoop/hh-fcc/nextjs-smartcontract-lottery/constants/abi.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating the front-end !!");
    updateContractAddresses();
    updateAbi();
  }
};

async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle");
  const chainId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
  );
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(raffle.address)) {
      currentAddresses[chainId].push(raffle.address);
    }
  }
  {
    currentAddresses[chainId] = [raffle.address];
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

async function updateAbi() {
  const raffle = await ethers.getContract("Raffle");
  fs.writeFileSync(
    FRONT_END_ABI_FILE,
    raffle.interface.format(ethers.utils.FormatTypes.json)
    /** if we use JSON instead of json in the above line, we getthe following error
     * TypeError: The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of Array
     */
  );
}

module.exports.tags = ["all", "frontend"];
