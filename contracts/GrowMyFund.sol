//SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract GrowMyFund is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IERC20 public stableCoinContract;

    mapping(address => bool) public moderators;

    uint256 public ROI_PERCENTAGE = 100; //10% ROI
    uint256 public TOTAL_PERCENTAGE = 1000; //100%
    uint256 public TOTAL_ROI_DURATION = 30 days; //30 days
    uint256 public TOTAL_ROI_INTERVAL = 7 days; //7 days

    uint256 public LAUNCH_TIME;

    uint256 public MAX_INVESTMENTS = 100;

    uint256 public totalInvestment;
    uint256 public totalClaimedReward;
    uint256 public totalInvestors;
    uint256 public capitalLocked;
    uint256 public capitalReleased;

    uint256 public currentInvestmentId;

    mapping(uint256 => Investment) public investments;
    mapping(address => Investor) public investors;

    struct Investment {
        address investorAddress;
        uint256 totalInvestment;
        uint256 startDate;
        uint256 rewardWithdrawn;
        uint256 maxReward;
        uint256 lastClaimedDate;
        bool isWithdrawn;
    }

    struct Investor {
        address investorAddress;
        uint256 totalInvestment;
        uint256 capitalLocked;
        uint256 capitalReleased;
        uint256 totalClaimedReward;
        uint256 startDate;
        uint256 totalInvestmentCount;
        uint256[] userInvestments;
    }

    modifier onlyModeratorsOrOwner() {
        require(
            moderators[msg.sender] || msg.sender == owner(),
            "Not a moderator or owner"
        );
        _;
    }

    constructor(address _stableCoinAddress, uint256 _launchTime) {
        require(_stableCoinAddress != address(0), "Invalid address");
        require(_launchTime > block.timestamp, "Invalid launch time");
        stableCoinContract = IERC20(_stableCoinAddress);
        LAUNCH_TIME = _launchTime;
    }

    function setStableCoinContract(
        address _stableCoinAddress
    ) public onlyOwner {
        require(_stableCoinAddress != address(0), "Invalid address");
        stableCoinContract = IERC20(_stableCoinAddress);
    }

    function setModeratorStatus(
        address _moderator,
        bool _status
    ) public onlyOwner {
        require(_moderator != address(0), "Invalid address");
        require(moderators[_moderator] != _status, "Invalid status");
        moderators[_moderator] = _status;
    }

    function investAmount(uint256 _stableCoinAmount) external {
        require(
            _stableCoinAmount > 0,
            "Investment amount must be greater than 0"
        );
        // max investment check
        require(
            investors[msg.sender].totalInvestmentCount < MAX_INVESTMENTS,
            "Max investment limit reached"
        );
        // launch time check
        require(block.timestamp >= LAUNCH_TIME, "Not launched yet");

        if (investors[msg.sender].investorAddress == address(0)) {
            totalInvestors = totalInvestors.add(1);
            investors[msg.sender].investorAddress = msg.sender;
            investors[msg.sender].startDate = block.timestamp;
        }

        stableCoinContract.safeTransferFrom(
            msg.sender,
            address(this),
            _stableCoinAmount
        );

        totalInvestment = totalInvestment.add(_stableCoinAmount);
        capitalLocked = capitalLocked.add(_stableCoinAmount);

        currentInvestmentId = currentInvestmentId.add(1);
        investments[currentInvestmentId] = Investment({
            investorAddress: msg.sender,
            totalInvestment: _stableCoinAmount,
            startDate: block.timestamp,
            lastClaimedDate: block.timestamp,
            rewardWithdrawn: 0,
            maxReward: _stableCoinAmount.mul(ROI_PERCENTAGE).div(
                TOTAL_PERCENTAGE
            ),
            isWithdrawn: false
        });

        investors[msg.sender].investorAddress = msg.sender;
        investors[msg.sender].totalInvestment = investors[msg.sender]
            .totalInvestment
            .add(_stableCoinAmount);
        investors[msg.sender].capitalLocked = investors[msg.sender]
            .capitalLocked
            .add(_stableCoinAmount);
        investors[msg.sender].userInvestments.push(currentInvestmentId);
        investors[msg.sender].totalInvestmentCount = investors[msg.sender]
            .totalInvestmentCount
            .add(1);
    }

    function getUserInvestments(
        address _investor
    ) public view returns (uint256[] memory _investments) {
        _investments = investors[_investor].userInvestments;
    }

    function getClaimableReward(
        uint256 _investmentId
    ) public view returns (uint256 _reward) {
        if (investments[_investmentId].investorAddress == address(0)) {
            return 0;
        }

        if (investments[_investmentId].isWithdrawn) {
            return 0;
        }

        uint256 _currentTime = block.timestamp >=
            investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
            ? investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
            : block.timestamp;

        uint256 _startDate = investments[_investmentId].lastClaimedDate >
            investments[_investmentId].startDate
            ? investments[_investmentId].lastClaimedDate
            : investments[_investmentId].startDate;

        uint256 _timePeriod = _currentTime.sub(_startDate);

        if (
            _timePeriod < TOTAL_ROI_INTERVAL &&
            _currentTime <
            investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
        ) {
            return 0;
        }

        if (
            _currentTime >=
            investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
        ) {
            _reward = investments[_investmentId].maxReward.sub(
                investments[_investmentId].rewardWithdrawn
            );
        } else {
            _reward = investments[_investmentId]
                .maxReward
                .div(TOTAL_ROI_DURATION)
                .mul(_timePeriod);
        }

        if (
            _reward.add(investments[_investmentId].rewardWithdrawn) >
            investments[_investmentId].maxReward
        ) {
            _reward = investments[_investmentId].maxReward.sub(
                investments[_investmentId].rewardWithdrawn
            );
        }
    }

    function getCurrentReward(
        uint256 _investmentId
    ) public view returns (uint256 _reward) {
        if (investments[_investmentId].investorAddress == address(0)) {
            return 0;
        }

        if (investments[_investmentId].isWithdrawn) {
            return 0;
        }

        uint256 _currentTime = block.timestamp >
            investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
            ? investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
            : block.timestamp;

        uint256 _startDate = investments[_investmentId].lastClaimedDate >
            investments[_investmentId].startDate
            ? investments[_investmentId].lastClaimedDate
            : investments[_investmentId].startDate;

        uint256 _timePeriod = _currentTime.sub(_startDate);

        if (
            _currentTime >=
            investments[_investmentId].startDate.add(TOTAL_ROI_DURATION)
        ) {
            _reward = investments[_investmentId].maxReward.sub(
                investments[_investmentId].rewardWithdrawn
            );
        } else {
            _reward = investments[_investmentId]
                .maxReward
                .div(TOTAL_ROI_DURATION)
                .mul(_timePeriod);
        }

        if (
            _reward.add(investments[_investmentId].rewardWithdrawn) >
            investments[_investmentId].maxReward
        ) {
            _reward = investments[_investmentId].maxReward.sub(
                investments[_investmentId].rewardWithdrawn
            );
        }
    }

    function withdrawReward(uint256 _investmentId) external {
        require(
            investments[_investmentId].investorAddress == msg.sender,
            "Invalid investment id"
        );

        uint256 _reward = getClaimableReward(_investmentId);

        require(_reward > 0, "No reward to claim");

        investments[_investmentId].rewardWithdrawn = investments[_investmentId]
            .rewardWithdrawn
            .add(_reward);

        investments[_investmentId].lastClaimedDate = block.timestamp;

        totalClaimedReward = totalClaimedReward.add(_reward);
        investors[msg.sender].totalClaimedReward = investors[msg.sender]
            .totalClaimedReward
            .add(_reward);

        if (
            investments[_investmentId].rewardWithdrawn >=
            investments[_investmentId].maxReward
        ) {
            investments[_investmentId].isWithdrawn = true;
            capitalLocked = capitalLocked.sub(
                investments[_investmentId].totalInvestment
            );
            capitalReleased = capitalReleased.add(
                investments[_investmentId].totalInvestment
            );

            investors[msg.sender].capitalLocked = investors[msg.sender]
                .capitalLocked
                .sub(investments[_investmentId].totalInvestment);
            investors[msg.sender].capitalReleased = investors[msg.sender]
                .capitalReleased
                .add(investments[_investmentId].totalInvestment);
            _reward = _reward.add(investments[_investmentId].totalInvestment);
        }

        require(getBalance() >= _reward, "Insufficient balance");

        stableCoinContract.safeTransfer(msg.sender, _reward);
    }

    function withdrawAllReward() external {
        uint256[] memory _investments = getUserInvestments(msg.sender);

        require(_investments.length > 0, "No investments");

        uint256 _totalReward = 0;
        uint256 _totalReleaseAmount = 0;

        for (uint256 i = 0; i < _investments.length; i++) {
            if (investments[_investments[i]].isWithdrawn) continue;
            uint256 _reward = getClaimableReward(_investments[i]);

            if (_reward > 0) {
                investments[_investments[i]].rewardWithdrawn = investments[
                    _investments[i]
                ].rewardWithdrawn.add(_reward);

                investments[_investments[i]].lastClaimedDate = block.timestamp;

                _totalReward = _totalReward.add(_reward);
            }

            if (
                investments[_investments[i]].rewardWithdrawn >=
                investments[_investments[i]].maxReward
            ) {
                investments[_investments[i]].isWithdrawn = true;
                capitalLocked = capitalLocked.sub(
                    investments[_investments[i]].totalInvestment
                );
                capitalReleased = capitalReleased.add(
                    investments[_investments[i]].totalInvestment
                );

                investors[msg.sender].capitalLocked = investors[msg.sender]
                    .capitalLocked
                    .sub(investments[_investments[i]].totalInvestment);
                investors[msg.sender].capitalReleased = investors[msg.sender]
                    .capitalReleased
                    .add(investments[_investments[i]].totalInvestment);
                _totalReleaseAmount = _totalReleaseAmount.add(
                    investments[_investments[i]].totalInvestment
                );
            }
        }

        require(_totalReward > 0, "No reward to claim");

        totalClaimedReward = totalClaimedReward.add(_totalReward);
        investors[msg.sender].totalClaimedReward = investors[msg.sender]
            .totalClaimedReward
            .add(_totalReward);

        _totalReward = _totalReward.add(_totalReleaseAmount);

        require(getBalance() >= _totalReward, "Insufficient balance");
        stableCoinContract.safeTransfer(msg.sender, _totalReward);
    }

    function depositStableCoin(uint256 _amount) external onlyModeratorsOrOwner {
        require(_amount > 0, "Invalid amount");
        stableCoinContract.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function withdrawStableCoin(
        uint256 _amount
    ) external onlyModeratorsOrOwner {
        require(_amount > 0, "Invalid amount");
        require(getBalance() >= _amount, "Insufficient balance");
        stableCoinContract.safeTransfer(msg.sender, _amount);
    }

    function getBalance() public view returns (uint256 _balance) {
        _balance = stableCoinContract.balanceOf(address(this));
    }
}
