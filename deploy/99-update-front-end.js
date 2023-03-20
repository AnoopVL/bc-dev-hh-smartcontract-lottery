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
  }
};

async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle");
  const chainId = network.config.chainId.toString();
  const curretAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
  );
  if (chainId in curretAddresses) {
    if (!curretAddresses[chainId].include(raffle.address)) {
      curretAddresses[chainId].push(raffle.address);
    }
    {
      curretAddresses[chainId] = [raffle.address];
    }
  }
}
