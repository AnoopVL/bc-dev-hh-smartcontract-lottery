// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
/*================ 7 ================*/
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
/*================ 9 ================*/
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

error Raffle_NotEnoughETHEntered();
error Raffle_TransferFailed();
error Raffle_NotOpen();

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /*================ 9 ================*/
    //enums can be used to create types with a finite set of constant values
    enum RaffleState {
        OPEN,
        CALCULATING
    } //here it works like: uint256 0= OPEN, 1= CALUCULATING
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
    /*================ 8 ================*/
    address private s_recentWinner;
    /*================ 9 ================*/
    RaffleState private s_raffelState;

    /*======================================== Events ========================================*/
    /*================ 6 ================*/
    event RaffleEnter(address indexed player);
    /*================ 7 ================*/
    event RequestedRaffleWinner(uint256 indexed requestID);
    /*================ 8 ================*/
    event winnerPicked(address indexed winner);

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
        s_raffelState = RaffleState.OPEN;
    }

    function enterRaffle() public payable {
        /*================ 4 ================*/
        //here msg.value > i_entranceFee, or return error
        if (msg.value < i_entranceFee) {
            revert Raffle_NotEnoughETHEntered();
        }
        /*================ 9 ================*/
        if (s_raffelState != RaffleState.OPEN) {
            revert Raffle_NotOpen();
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
        /*================ 9 ================*/
        s_raffelState = RaffleState.CALCULATING;
        uint256 requestID = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionID,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestID);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */

    function checkUpkeep(bytes calldata /*checkData*/) external override {
        /*================ 9 ================*/
        //we use this function to check if it is time to get a random number
        //to update the recent winner and send them the funds
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        /*================ 8 ================*/
        //here by using mod we get index of winner
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle_TransferFailed();
        }
        emit winnerPicked(recentWinner);
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

    function getRecentWinnner() public view returns (address) {
        /*================ 8 ================*/
        return s_recentWinner;
    }

    function performUpkeep(bytes calldata performData) external override {}
}
