import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ONE_DAY = 86400;
describe("Grow My Fund", function () {
  async function deploySmartContract() {
    const [owner, moderator1, moderator2, investor1, investor2, investor3] = await ethers.getSigners();

    const StableCoin = await ethers.getContractFactory("BUSD");
    const stableCoin = await StableCoin.deploy();
    await stableCoin.deployed();

    const stableCoinAddress = stableCoin.address;

    const GrowMyFundBSC = await ethers.getContractFactory("GrowMyFund");
    const launchTime = Math.floor(Date.now() / 1000) + ONE_DAY;

    const growMyFundBSC = await GrowMyFundBSC.deploy(stableCoinAddress, launchTime);

    await growMyFundBSC.deployed();

    const growMyFundBSCAddress = growMyFundBSC.address;

    return {
      owner,
      moderator1,
      moderator2,
      investor1,
      investor2,
      stableCoin,
      stableCoinAddress,
      growMyFundBSC,
      growMyFundBSCAddress,
      investor3,
    }
  };

  // Write unit tests for all functions both positive and negative tests (i.e. test for reverts)
  it("Check basic contract details", async function () {
    const { growMyFundBSC, owner } = await loadFixture(deploySmartContract);

    expect(await growMyFundBSC.TOTAL_PERCENTAGE()).to.equal(1000);
    expect(await growMyFundBSC.ROI_PERCENTAGE()).to.equal(100);
    expect(await growMyFundBSC.TOTAL_ROI_INTERVAL()).to.equal(7 * 86400);
    expect(await growMyFundBSC.totalInvestment()).to.equal(0);
    expect(await growMyFundBSC.totalClaimedReward()).to.equal(0);
    expect(await growMyFundBSC.totalInvestors()).to.equal(0);
    expect(await growMyFundBSC.owner()).to.equal(owner.address);
  });

  it("Should Fail: Set Moderator With Non Owner", async function () {
    const { growMyFundBSC, moderator1 } = await loadFixture(deploySmartContract);

    await expect(growMyFundBSC.connect(moderator1).setModeratorStatus(moderator1.address, true)).to.be.revertedWith("Ownable: caller is not the owner");

    expect(await growMyFundBSC.moderators(moderator1.address)).to.equal(false);

  });

  it("Check contract owner can add moderators", async function () {
    const { growMyFundBSC, moderator1, moderator2 } = await loadFixture(deploySmartContract);

    const addModerator1Tx = await growMyFundBSC.setModeratorStatus(moderator1.address, true);
    await addModerator1Tx.wait();

    expect(await growMyFundBSC.moderators(moderator1.address)).to.equal(true);

    const addModerator2Tx = await growMyFundBSC.setModeratorStatus(moderator2.address, true);
    await addModerator2Tx.wait();

    expect(await growMyFundBSC.moderators(moderator2.address)).to.equal(true);
  });

  it("Should Fail: Set Moderator With Non Owner", async function () {
    const { growMyFundBSC, moderator1, moderator2 } = await loadFixture(deploySmartContract);

    await expect(growMyFundBSC.connect(moderator1).setModeratorStatus(moderator2.address, false)).to.be.revertedWith("Ownable: caller is not the owner");

    expect(await growMyFundBSC.moderators(moderator2.address)).to.equal(true);
  });

  it("Check contract owner can remove moderators", async function () {
    const { growMyFundBSC, moderator1, moderator2 } = await loadFixture(deploySmartContract);

    expect(await growMyFundBSC.moderators(moderator1.address)).to.equal(true);

    const addModerator1Tx = await growMyFundBSC.setModeratorStatus(moderator1.address, false);
    await addModerator1Tx.wait();

    expect(await growMyFundBSC.moderators(moderator1.address)).to.equal(false);

    expect(await growMyFundBSC.moderators(moderator2.address)).to.equal(true);

    const addModerator2Tx = await growMyFundBSC.setModeratorStatus(moderator2.address, false);

    await addModerator2Tx.wait();

    expect(await growMyFundBSC.moderators(moderator2.address)).to.equal(false);
  });

  it("Check contract owner can add moderators", async function () {
    const { growMyFundBSC, moderator1, moderator2 } = await loadFixture(deploySmartContract);

    const addModerator1Tx = await growMyFundBSC.setModeratorStatus(moderator1.address, true);
    await addModerator1Tx.wait();

    expect(await growMyFundBSC.moderators(moderator1.address)).to.equal(true);

    const addModerator2Tx = await growMyFundBSC.setModeratorStatus(moderator2.address, true);
    await addModerator2Tx.wait();

    expect(await growMyFundBSC.moderators(moderator2.address)).to.equal(true);
  });

  it("Should Fail: Invest amount before launch time", async function () {
    const { growMyFundBSC, investor1 } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("1000");

    await expect(growMyFundBSC.connect(investor1).investAmount(amountInWei)).to.be.revertedWith("Not launched yet");

  });
  it("Check balance before transfer", async function () {
    const { stableCoin, investor1, investor2 } = await loadFixture(deploySmartContract);

    const investor1Balance = await stableCoin.balanceOf(investor1.address);

    expect(investor1Balance).to.equal(0);

    const investor2Balance = await stableCoin.balanceOf(investor2.address);

    expect(investor2Balance).to.equal(0);
  })

  it("Transfer stableCoin to investors", async function () {
    const { stableCoin, investor1, investor2 } = await loadFixture(deploySmartContract);

    await time.increase(ONE_DAY * 2)

    const amountInWei = ethers.utils.parseEther("1000");

    const transferToInvestor1Tx = await stableCoin.transfer(investor1.address, amountInWei);

    await transferToInvestor1Tx.wait();

    const transferToInvestor2Tx = await stableCoin.transfer(investor2.address, amountInWei);

    await transferToInvestor2Tx.wait();
  });

  it("Check balance after transfer", async function () {
    const { stableCoin, investor1, investor2 } = await loadFixture(deploySmartContract);

    const investor1Balance = await stableCoin.balanceOf(investor1.address);

    expect(investor1Balance).to.equal(ethers.utils.parseEther("1000"));

    const investor2Balance = await stableCoin.balanceOf(investor2.address);

    expect(investor2Balance).to.equal(ethers.utils.parseEther("1000"));
  });

  it("Should Fail: Investor1 invests with 0 stableCoin", async function () {
    const { stableCoin, investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("0");

    const approveTx = await stableCoin.connect(investor1).approve(growMyFundBSC.address, amountInWei);

    await approveTx.wait();

    await expect(growMyFundBSC.connect(investor1).investAmount(amountInWei)).to.be.revertedWith("Investment amount must be greater than 0");
  });

  it("Should Fail: Investor1 invests with 100 stableCoin but has not approved stableCoin", async function () {

    const { investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("100");

    await expect(growMyFundBSC.connect(investor1).investAmount(amountInWei)).to.be.revertedWith('ERC20: insufficient allowance');
  });

  it("Invest amount", async function () {
    const { stableCoin, investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("1000");

    const approveTx = await stableCoin.connect(investor1).approve(growMyFundBSC.address, amountInWei);

    await approveTx.wait();

    const investTx = await growMyFundBSC.connect(investor1).investAmount(amountInWei);

    await investTx.wait();

    expect(await growMyFundBSC.totalInvestment()).to.equal(amountInWei);
    expect(await growMyFundBSC.capitalLocked()).to.equal(amountInWei);
    expect(await growMyFundBSC.capitalReleased()).to.equal(0);
    expect(await growMyFundBSC.totalInvestors()).to.equal(1);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(1);

    const investment = await growMyFundBSC.investments(1);

    const investor = await growMyFundBSC.investors(investor1.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor1.address);

    expect(investment.totalInvestment).to.equal(amountInWei);

    expect(investment.startDate).to.equal(investor.startDate);
    expect(investment.rewardWithdrawn).to.equal(0);
    expect(investment.maxReward).to.equal(amountInWei.div(10));
    expect(investment.lastClaimedDate).to.equal(investor.startDate);

    expect(investor.totalInvestment).to.equal(amountInWei);
    expect(investor.totalClaimedReward).to.equal(0);
    expect(investor.capitalLocked).to.equal(amountInWei);
    expect(investor.capitalReleased).to.equal(0);
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(1);
    expect(userInvestments[0]).to.equal(1);
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(5 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 5 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(1);

    expect(await growMyFundBSC.getClaimableReward(1)).to.equal(0);
  });

  it("Should Fail: Investor1 tries to claim reward before 7 days", async function () {
    const { investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    await expect(growMyFundBSC.connect(investor1).withdrawReward(1)).to.be.revertedWith("No reward to claim");
    await expect(growMyFundBSC.connect(investor1).withdrawAllReward()).to.be.revertedWith("No reward to claim");
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(2 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 7 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(1);

    const reward = await growMyFundBSC.getCurrentReward(1);
    const claimableReward = await growMyFundBSC.getClaimableReward(1);

    const rewardInEth = ethers.utils.formatEther(reward);
    const claimableRewardInEth = ethers.utils.formatEther(claimableReward);

    const maxRewardInEth = ethers.utils.formatEther(investment.maxReward);


    expect(parseFloat(rewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (7 / 30));
    expect(parseFloat(claimableRewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (7 / 30));
  });


  it("Withdraw Reward", async function () {
    const { investor1, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);
    await time.increase(8 * ONE_DAY);

    const balanceBefore = await stableCoin.balanceOf(investor1?.address);

    expect(balanceBefore).to.equal(0)

    const trx = await growMyFundBSC.connect(investor1).withdrawReward(1);

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor1?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.greaterThanOrEqual(50)
    expect(balanceAfter).to.equal(totalClaimedReward);


    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("0"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(1);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(1);

    const investment = await growMyFundBSC.investments(1);

    const investor = await growMyFundBSC.investors(investor1.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor1.address);

    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));

    expect(investment.startDate).to.equal(investor.startDate);
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(parseFloat(ethers.utils.formatEther(investor.totalClaimedReward))).to.greaterThanOrEqual(50);
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("0"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(1);
    expect(userInvestments[0]).to.equal(1);


  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(15 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 30 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(1);

    const reward = await growMyFundBSC.getCurrentReward(1);
    const claimableReward = await growMyFundBSC.getClaimableReward(1);

    const rewardInEth = ethers.utils.formatEther(reward);
    const claimableRewardInEth = ethers.utils.formatEther(claimableReward);

    const maxRewardInEth = ethers.utils.formatEther(investment.maxReward.sub(investment.rewardWithdrawn));

    expect(parseFloat(rewardInEth)).to.equal(parseFloat(maxRewardInEth));
    expect(parseFloat(claimableRewardInEth)).to.equal(parseFloat(maxRewardInEth));
  });

  it("Should Fail: Deposit stableCoin to Grow My Fund by non-owner", async function () {

    const { stableCoin, investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("2000");

    await expect(growMyFundBSC.connect(investor1).depositStableCoin(amountInWei)).to.be.revertedWith('Not a moderator or owner');
  });

  it("Deposit stableCoin to Grow My Fund", async function () {
    const { stableCoin, owner, growMyFundBSC } = await loadFixture(deploySmartContract);

    const balanceBefore = await growMyFundBSC.getBalance();

    const amountInWei = ethers.utils.parseEther("2000");

    const trx = await stableCoin.connect(owner).approve(growMyFundBSC.address, amountInWei);

    await trx.wait();

    const trx2 = await growMyFundBSC.connect(owner).depositStableCoin(amountInWei);

    await trx2.wait();

    const balanceAfter = await growMyFundBSC.getBalance();

    expect(balanceAfter).to.equal(balanceBefore.add(amountInWei));
  })

  it("Should Fail: Withdraw stableCoin to Grow My Fund by non-owner", async function () {

    const { investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("2000");

    await expect(growMyFundBSC.connect(investor1).withdrawStableCoin(amountInWei)).to.be.revertedWith('Not a moderator or owner');
  });

  it("Withdraw stableCoin", async function () {
    const { stableCoin, owner, growMyFundBSC } = await loadFixture(deploySmartContract);

    const balanceBefore = await stableCoin.balanceOf(owner.address);

    const amountInWei = ethers.utils.parseEther("1000");

    const trx = await growMyFundBSC.connect(owner).withdrawStableCoin(amountInWei);

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(owner.address);

    expect(balanceAfter).to.equal(balanceBefore.add(amountInWei));
  });

  it("Withdraw Reward after 30 days", async function () {
    const { investor1, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);
    await time.increase(8 * ONE_DAY);

    const stableCoinBalance = await growMyFundBSC.getBalance();

    const totalInvestment = await growMyFundBSC.totalInvestment();
    const totalInvestors = await growMyFundBSC.totalInvestors();
    const currentInvestmentId = await growMyFundBSC.currentInvestmentId();

    const trx = await growMyFundBSC.connect(investor1).withdrawReward(1);

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor1?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.greaterThanOrEqual(50)
    expect(balanceAfter).to.equal(ethers.utils.parseEther("1100"));

    const investment = await growMyFundBSC.investments(1);

    expect(investment.investorAddress).to.equal(investor1.address);
    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));
    expect(investment.rewardWithdrawn).to.equal(ethers.utils.parseEther("100"));
    expect(investment.rewardWithdrawn).to.equal(ethers.utils.parseEther("100"));
    expect(investment.isWithdrawn).to.equal(true);

    const getCurrentReward = await growMyFundBSC.getCurrentReward(1);
    const getClaimableReward = await growMyFundBSC.getClaimableReward(1);

    expect(getCurrentReward).to.equal(0);
    expect(getClaimableReward).to.equal(0);


    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("0"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(1);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(1);

    const investor = await growMyFundBSC.investors(investor1.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor1.address);

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.totalClaimedReward).to.equal(ethers.utils.parseEther("100"));
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("0"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(1);
    expect(userInvestments[0]).to.equal(1);
  });

  it("Should Fail: Withdraw Reward after claiming reward", async function () {
    const { investor1, growMyFundBSC } = await loadFixture(deploySmartContract);

    await expect(growMyFundBSC.connect(investor1).withdrawReward(1)).to.be.revertedWith("No reward to claim");

    await expect(growMyFundBSC.connect(investor1).withdrawAllReward()).to.be.revertedWith("No reward to claim");
  });

  it("Invest amount with investor2", async () => {
    const { stableCoin, investor2, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("1000");

    const trx = await stableCoin.connect(investor2).approve(growMyFundBSC.address, amountInWei);

    await trx.wait();

    const trx2 = await growMyFundBSC.connect(investor2).investAmount(amountInWei);

    await trx2.wait();

    const investment = await growMyFundBSC.investments(2);

    expect(investment.investorAddress).to.equal(investor2.address);
    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));
    expect(investment.rewardWithdrawn).to.equal(ethers.utils.parseEther("0"));
    expect(investment.isWithdrawn).to.equal(false);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);
    expect(userInvestments.length).to.equal(1);
    expect(userInvestments[0]).to.equal(2);

    const totalInvestment = await growMyFundBSC.totalInvestment();
    const totalInvestors = await growMyFundBSC.totalInvestors();
    const currentInvestmentId = await growMyFundBSC.currentInvestmentId();
    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const capitalLocked = await growMyFundBSC.capitalLocked();
    const capitalReleased = await growMyFundBSC.capitalReleased();
    expect(totalInvestment).to.equal(ethers.utils.parseEther("2000"));
    expect(totalInvestors).to.equal(2);
    expect(currentInvestmentId).to.equal(2);
    expect(totalClaimedReward).to.equal(ethers.utils.parseEther("100"));
    expect(capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(capitalReleased).to.equal(ethers.utils.parseEther("1000"));

    const investor = await growMyFundBSC.investors(investor2.address);

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.totalClaimedReward).to.equal(ethers.utils.parseEther("0"));
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("0"));
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(25 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 25 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(2);

    const reward = await growMyFundBSC.getCurrentReward(2);
    const claimableReward = await growMyFundBSC.getClaimableReward(2);

    const rewardInEth = ethers.utils.formatEther(reward);
    const claimableRewardInEth = ethers.utils.formatEther(claimableReward);

    const maxRewardInEth = ethers.utils.formatEther(investment.maxReward);


    expect(parseFloat(rewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (25 / 30));
    expect(parseFloat(claimableRewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (25 / 30));
  });

  it("Withdraw reward after 25 days", async function () {
    const { investor2, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);

    const balanceBefore = await stableCoin.balanceOf(investor2?.address);

    expect(balanceBefore).to.equal(0)

    const trx = await growMyFundBSC.connect(investor2).withdrawReward(2);

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor2?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.greaterThanOrEqual(83)
    expect(balanceAfter).to.equal(totalClaimedReward.sub(ethers.utils.parseEther("100")));


    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("2000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(2);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(2);

    const investment = await growMyFundBSC.investments(2);

    const investor = await growMyFundBSC.investors(investor2.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);

    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));

    expect(investment.startDate).to.equal(investor.startDate);
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(parseFloat(ethers.utils.formatEther(investor.totalClaimedReward))).to.greaterThanOrEqual(83);
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("0"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(1);
    expect(userInvestments[0]).to.equal(2);
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(5 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 30 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(2);

    const reward = await growMyFundBSC.getCurrentReward(2);
    const claimableReward = await growMyFundBSC.getClaimableReward(2);

    const rewardInEth = ethers.utils.formatEther(reward);
    const claimableRewardInEth = ethers.utils.formatEther(claimableReward);

    const maxRewardInEth = ethers.utils.formatEther(investment.maxReward);


    expect(parseFloat(rewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) - parseFloat(ethers.utils.formatEther(investment.rewardWithdrawn)));
    expect(parseFloat(claimableRewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) - parseFloat(ethers.utils.formatEther(investment.rewardWithdrawn)));
  });

  it("Withdraw reward after 30 days", async function () {
    const { investor2, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);

    const trx = await growMyFundBSC.connect(investor2).withdrawReward(2);

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor2?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.equal(200)
    expect(balanceAfter).to.equal(ethers.utils.parseEther("1100"));


    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("2000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("0"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("2000"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(2);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(2);

    const investment = await growMyFundBSC.investments(2);

    const investor = await growMyFundBSC.investors(investor2.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);

    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));

    expect(investment.startDate).to.equal(investor.startDate);
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.totalClaimedReward).to.equal(ethers.utils.parseEther("100"));
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("0"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(1);
    expect(userInvestments[0]).to.equal(2);
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner, investor2 } = await loadFixture(deploySmartContract);

    const trx = await stableCoin.transfer(investor2?.address, ethers.utils.parseEther("2000"));

    await trx.wait();
  });

  it("Invest amount with investor2", async () => {
    const { stableCoin, investor2, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("1000");

    const trx = await stableCoin.connect(investor2).approve(growMyFundBSC.address, amountInWei);

    await trx.wait();

    const trx2 = await growMyFundBSC.connect(investor2).investAmount(amountInWei);

    await trx2.wait();

    const investment = await growMyFundBSC.investments(3);

    expect(investment.investorAddress).to.equal(investor2.address);
    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));
    expect(investment.rewardWithdrawn).to.equal(ethers.utils.parseEther("0"));
    expect(investment.isWithdrawn).to.equal(false);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);
    expect(userInvestments.length).to.equal(2);
    expect(userInvestments[0]).to.equal(2);
    expect(userInvestments[1]).to.equal(3);

    const totalInvestment = await growMyFundBSC.totalInvestment();
    const totalInvestors = await growMyFundBSC.totalInvestors();
    const currentInvestmentId = await growMyFundBSC.currentInvestmentId();
    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const capitalLocked = await growMyFundBSC.capitalLocked();
    const capitalReleased = await growMyFundBSC.capitalReleased();
    expect(totalInvestment).to.equal(ethers.utils.parseEther("3000"));
    expect(totalInvestors).to.equal(2);
    expect(currentInvestmentId).to.equal(3);
    expect(totalClaimedReward).to.equal(ethers.utils.parseEther("200"));
    expect(capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(capitalReleased).to.equal(ethers.utils.parseEther("2000"));

    const investor = await growMyFundBSC.investors(investor2.address);

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("2000"));
    expect(investor.totalClaimedReward).to.equal(ethers.utils.parseEther("100"));
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("1000"));
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(25 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 25 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(3);

    const reward = await growMyFundBSC.getCurrentReward(3);
    const claimableReward = await growMyFundBSC.getClaimableReward(3);

    const rewardInEth = ethers.utils.formatEther(reward);
    const claimableRewardInEth = ethers.utils.formatEther(claimableReward);

    const maxRewardInEth = ethers.utils.formatEther(investment.maxReward);


    expect(parseFloat(rewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (25 / 30));
    expect(parseFloat(claimableRewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (25 / 30));
  });

  it("Withdraw reward after 25 days", async function () {
    const { investor2, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);

    const trx = await growMyFundBSC.connect(investor2).withdrawAllReward();

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor2?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.greaterThanOrEqual(283)


    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("3000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("2000"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(2);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(3);

    const investment = await growMyFundBSC.investments(3);

    const investor = await growMyFundBSC.investors(investor2.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);

    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));

    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("2000"));
    expect(parseFloat(ethers.utils.formatEther(investor.totalClaimedReward))).to.greaterThanOrEqual(183);
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(2);
    expect(userInvestments[0]).to.equal(2);
  });


  it("Invest amount with investor2", async () => {
    const { stableCoin, investor2, growMyFundBSC } = await loadFixture(deploySmartContract);

    const amountInWei = ethers.utils.parseEther("1000");

    const trx = await stableCoin.connect(investor2).approve(growMyFundBSC.address, amountInWei);

    await trx.wait();

    const trx2 = await growMyFundBSC.connect(investor2).investAmount(amountInWei);

    await trx2.wait();

    const investment = await growMyFundBSC.investments(4);

    expect(investment.investorAddress).to.equal(investor2.address);
    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));
    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));
    expect(investment.rewardWithdrawn).to.equal(ethers.utils.parseEther("0"));
    expect(investment.isWithdrawn).to.equal(false);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);
    expect(userInvestments.length).to.equal(3);
    expect(userInvestments[0]).to.equal(2);
    expect(userInvestments[1]).to.equal(3);
    expect(userInvestments[2]).to.equal(4);

    const totalInvestment = await growMyFundBSC.totalInvestment();
    const totalInvestors = await growMyFundBSC.totalInvestors();
    const currentInvestmentId = await growMyFundBSC.currentInvestmentId();
    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const capitalLocked = await growMyFundBSC.capitalLocked();
    const capitalReleased = await growMyFundBSC.capitalReleased();
    expect(totalInvestment).to.equal(ethers.utils.parseEther("4000"));
    expect(totalInvestors).to.equal(2);
    expect(currentInvestmentId).to.equal(4);
    expect(parseFloat(ethers.utils.formatEther(totalClaimedReward))).to.be.greaterThanOrEqual(283);
    expect(capitalLocked).to.equal(ethers.utils.parseEther("2000"));
    expect(capitalReleased).to.equal(ethers.utils.parseEther("2000"));

    const investor = await growMyFundBSC.investors(investor2.address);

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("3000"));
    expect(parseFloat(ethers.utils.formatEther(investor.totalClaimedReward))).to.greaterThanOrEqual(183);
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("2000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("1000"));
  });

  it("Transfer amount", async function () {
    const { stableCoin, owner } = await loadFixture(deploySmartContract);
    await time.increase(25 * ONE_DAY);
    const trx = await stableCoin.transfer(owner.address, ethers.utils.parseEther("1000"));

    await trx.wait();
  });

  it("Check reward after 25 days", async function () {
    const { growMyFundBSC } = await loadFixture(deploySmartContract);

    const investment = await growMyFundBSC.investments(4);

    const reward = await growMyFundBSC.getCurrentReward(4);
    const claimableReward = await growMyFundBSC.getClaimableReward(4);

    const rewardInEth = ethers.utils.formatEther(reward);
    const claimableRewardInEth = ethers.utils.formatEther(claimableReward);

    const maxRewardInEth = ethers.utils.formatEther(investment.maxReward);

    expect(parseFloat(rewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (25 / 30));
    expect(parseFloat(claimableRewardInEth)).to.greaterThanOrEqual(parseFloat(maxRewardInEth) * (25 / 30));
  });

  it("Withdraw reward after 25 days", async function () {
    const { investor2, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);

    const trx = await growMyFundBSC.connect(investor2).withdrawAllReward();

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor2?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.greaterThanOrEqual(283)

    const investment = await growMyFundBSC.investments(4);

    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("4000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("1000"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("3000"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(2);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(4);



    const investor = await growMyFundBSC.investors(investor2.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);

    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));

    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("3000"));
    expect(parseFloat(ethers.utils.formatEther(investor.totalClaimedReward))).to.greaterThanOrEqual(283);
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("1000"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("2000"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(3);
    expect(userInvestments[0]).to.equal(2);
  });

  it("Withdraw reward after 30 days", async function () {
    const { investor2, growMyFundBSC, stableCoin } = await loadFixture(deploySmartContract);
    await time.increase(5 * ONE_DAY);

    const trx = await growMyFundBSC.connect(investor2).withdrawAllReward();

    await trx.wait();

    const balanceAfter = await stableCoin.balanceOf(investor2?.address);

    const totalClaimedReward = await growMyFundBSC.totalClaimedReward();
    const totalClaimedRewardEth = ethers.utils.formatUnits(totalClaimedReward?.toString());

    expect(parseFloat(totalClaimedRewardEth)).to.greaterThanOrEqual(400)


    expect(await growMyFundBSC.totalInvestment()).to.equal(ethers.utils.parseEther("4000"));
    expect(await growMyFundBSC.capitalLocked()).to.equal(ethers.utils.parseEther("0"));
    expect(await growMyFundBSC.capitalReleased()).to.equal(ethers.utils.parseEther("4000"));
    expect(await growMyFundBSC.totalInvestors()).to.equal(2);
    expect(await growMyFundBSC.currentInvestmentId()).to.equal(4);

    const investment = await growMyFundBSC.investments(4);

    const investor = await growMyFundBSC.investors(investor2.address);

    const userInvestments = await growMyFundBSC.getUserInvestments(investor2.address);

    expect(investment.totalInvestment).to.equal(ethers.utils.parseEther("1000"));

    expect(investment.maxReward).to.equal(ethers.utils.parseEther("100"));

    expect(investor.totalInvestment).to.equal(ethers.utils.parseEther("3000"));
    expect(parseFloat(ethers.utils.formatEther(investor.totalClaimedReward))).to.greaterThanOrEqual(283);
    expect(investor.capitalLocked).to.equal(ethers.utils.parseEther("0"));
    expect(investor.capitalReleased).to.equal(ethers.utils.parseEther("3000"));
    expect(investor.startDate).to.equal(investor.startDate);

    expect(userInvestments.length).to.equal(3);
    expect(userInvestments[0]).to.equal(2);
  });

  it("Transfer 10000", async function () {
    const { stableCoin, owner, investor3 } = await loadFixture(deploySmartContract);
    const trx = await stableCoin.transfer(investor3.address, ethers.utils.parseEther("10000"));

    await trx.wait();
  })

  it("Invest 100 BUSD each in 100 investments", async () => {
    const { growMyFundBSC, investor3, stableCoin } = await loadFixture(deploySmartContract);
    const approveTrx = await stableCoin.connect(investor3).approve(growMyFundBSC.address, ethers.utils.parseEther("10000"));
    await approveTrx.wait();
    for (let i = 0; i < 100; i++) {
      const trx = await growMyFundBSC.connect(investor3).investAmount(ethers.utils.parseEther("100"));
      await trx.wait();
    }
  });

  it("Should Fail: Try to invest 101th investment", async () => {
    const { growMyFundBSC, investor3 } = await loadFixture(deploySmartContract);

    await expect(growMyFundBSC.connect(investor3).investAmount(ethers.utils.parseEther("100"))).to.be.revertedWith("Max investment limit reached");
  });
});
