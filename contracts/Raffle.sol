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
error Raffle_UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

/** @title A simple Raffle Contract
 * @author Anoop V. Lanjekar
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink keepers
 */

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
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    /*================ 8 ================*/
    address private s_recentWinner;
    /*================ 9 ================*/
    RaffleState private s_raffleState;
    /*================ 10 ================*/
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /*======================================== Events ========================================*/
    /*================ 6 ================*/
    event RaffleEnter(address indexed player);
    /*================ 7 ================*/
    event RequestedRaffleWinner(uint256 indexed requestId);
    /*================ 8 ================*/
    event winnerPicked(address indexed winner);

    constructor(
        /*================ 7 ================*/
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        /*================ 10 ================*/
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        //vrfCoordinator is address of the contract which does the random
        //number verifications
        /*================ 2 ================*/
        i_entranceFee = entranceFee;
        /*================ 7 ================*/
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        /*================ 10 ================*/
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        /*================ 4 ================*/
        //here msg.value > i_entranceFee, or return error
        if (msg.value < i_entranceFee) {
            revert Raffle_NotEnoughETHEntered();
        }
        /*================ 9 ================*/
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle_NotOpen();
        }
        //for updating the variable s_players
        s_players.push(payable(msg.sender));
        /*================ 2 ================*/
        /*================ 6 ================*/
        emit RaffleEnter(msg.sender);
    }

    //  We change requestRandomWinner() to performUpkeep to integrate with checkUpkeep
    //     function requestRandomWinner() external {
    //         /*================ 7 ================*/
    //         //this function is executed by chainlinkVRF
    //         //here we first request a random number
    //         //once we get it, do something with it
    //         //this is a 2 transaction process, in order to avoid any malpractices
    //         /*================ 9 ================*/
    //         s_raffleState = RaffleState.CALCULATING;
    //         uint256 requestId = i_vrfCoordinator.requestRandomWords(
    //             i_gasLane,
    //             i_subscriptionId,
    //             REQUEST_CONFIRMATIONS,
    //             i_callbackGasLimit,
    //             NUM_WORDS
    //         );
    //         emit RequestedRaffleWinner(requestId);
    //     }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */

    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (bool upkeepNeeded, bytes memory /*performData */)
    {
        /*================ 9 ================*/
        //we use this function to check if it is time to get a random number
        //to update the recent winner and send them the funds
        /*================ 10 ================*/
        //the below bool is true if raffleState is in open state !!
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        //to get how much time is passed, we do [block.timestamp - last block's timestamp] > interval
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        /*================ 11 ================*/
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle_UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            // uint256 requestId = i_vrfCoordinator.requestRandomWords
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
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
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
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

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public view returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public view returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
