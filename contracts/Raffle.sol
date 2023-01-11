// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
/*================ 7 ================*/
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

error Raffle_NotEnoughETHEntered();

contract Raffle is VRFConsumerBaseV2 {
    /*================ 1 ================*/
    //first we create an immutable variable(to save gas) i_entranceFee
    //then we create a constructor where we initialize i_entranceFee to entranceFee variable
    uint256 private immutable i_entranceFee;
    //we create address variable which is payable to store addresses of players
    address payable[] private s_players;
    /*================ 7 ================*/
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionID;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    /*================ Events ================*/
    /*================ 6 ================*/
    event RaffleEnter(address indexed player);
    /*================ 7 ================*/
    event RequestedRaffleWinner(uint256 indexed requestID);

    constructor(
        /*================ 7 ================*/
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionID,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        //vrfCoordinator is address of the contract which does the random
        //number verifications
        /*================ 2 ================*/
        i_entranceFee = entranceFee;
        /*================ 7 ================*/
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionID = subscriptionID;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterRaffle() public payable {
        /*================ 4 ================*/
        //here msg.value > i_entranceFee, or return error
        if (msg.value < i_entranceFee) {
            revert Raffle_NotEnoughETHEntered();
        }
        //for updating the variable s_players
        s_players.push(payable(msg.sender));
        /*================ 2 ================*/
        /*================ 6 ================*/
        emit RaffleEnter(msg.sender);
    }

    function requestRandomWinner() external {
        /*================ 7 ================*/
        //this function is executed by chainlinkVRF
        //here we first request a random number
        //once we get it, do something with it
        //this is a 2 transaction process, in order to avoid any malpractices
        uint256 requestID = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionID,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestID);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        /*================ 7 ================*/
    }

    //we create this function to return the value of entrance fee
    function getEntranceFee() public view returns (uint256) {
        /*================ 3 ================*/
        return i_entranceFee;
    }

    //we create this function to return the address of players
    function getPlayer(uint256 index) public view returns (address) {
        /*================ 5 ================*/
        return s_players[index];
    }
}
