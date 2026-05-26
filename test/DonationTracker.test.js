import { expect } from "chai";
import hre from "hardhat";

describe("DonationTracker", function () {
  let ethers;

  before(async function () {
    ({ ethers } = await hre.network.connect());
  });

  async function deployFixture() {
    const [owner, verifier, donor, other] = await ethers.getSigners();

    const DonationTracker = await ethers.getContractFactory("DonationTracker");
    const contract = await DonationTracker.deploy(verifier.address);
    await contract.waitForDeployment();

    return { contract, owner, verifier, donor, other };
  }

  it("deploys with correct owner and verifier", async function () {
    const { contract, owner, verifier } = await deployFixture();

    expect(await contract.owner()).to.equal(owner.address);
    expect(await contract.verifier()).to.equal(verifier.address);
    expect(await contract.totalDonated()).to.equal(0n);
  });

  it("accepts donations and records them", async function () {
    const { contract, donor } = await deployFixture();
    const amount = ethers.parseEther("1");

    await contract.connect(donor).donate({ value: amount });

    expect(await contract.totalDonated()).to.equal(amount);

    const donations = await contract.getDonations();
    expect(donations.length).to.equal(1);
    expect(donations[0].donor).to.equal(donor.address);
    expect(donations[0].amount).to.equal(amount);
    expect(donations[0].timestamp).to.be.greaterThan(0n);
  });

  it("allows owner to submit milestones", async function () {
    const { contract, owner, other } = await deployFixture();

    await contract.connect(owner).submitMilestone(0);
    const milestones = await contract.getMilestones();
    expect(milestones[0].submitted).to.equal(true);

    await expect(contract.connect(other).submitMilestone(0)).to.be.revertedWith(
      "Not the owner"
    );
  });

  it("allows verifier to approve submitted milestones", async function () {
    const { contract, owner, verifier, other } = await deployFixture();

    await expect(
      contract.connect(verifier).approveMilestone(0)
    ).to.be.revertedWith("Milestone not submitted");

    await contract.connect(owner).submitMilestone(0);
    await contract.connect(verifier).approveMilestone(0);

    const milestones = await contract.getMilestones();
    expect(milestones[0].approved).to.equal(true);

    await expect(
      contract.connect(other).approveMilestone(0)
    ).to.be.revertedWith("Not the verifier");
  });

  it("releases funds after approval and logs withdrawal", async function () {
    const { contract, owner, verifier, donor } = await deployFixture();
    const amount = ethers.parseEther("1");

    await contract.connect(donor).donate({ value: amount });
    await contract.connect(owner).submitMilestone(0);
    await contract.connect(verifier).approveMilestone(0);

    const expectedRelease = (amount * 30n) / 100n;

    await expect(contract.connect(owner).releaseFunds(0)).to.changeEtherBalances(
      ethers,
      [owner, contract],
      [expectedRelease, -expectedRelease]
    );

    const milestones = await contract.getMilestones();
    expect(milestones[0].released).to.equal(true);

    await expect(contract.connect(owner).releaseFunds(0)).to.be.revertedWith(
      "Already released"
    );

    const withdrawals = await contract.getWithdrawals();
    expect(withdrawals.length).to.equal(1);
    expect(withdrawals[0].milestoneIndex).to.equal(0n);
    expect(withdrawals[0].amount).to.equal(expectedRelease);
    expect(withdrawals[0].timestamp).to.be.greaterThan(0n);
  });

  it("rejects release before approval", async function () {
    const { contract, owner, donor } = await deployFixture();
    const amount = ethers.parseEther("1");

    await contract.connect(donor).donate({ value: amount });
    await contract.connect(owner).submitMilestone(0);

    await expect(contract.connect(owner).releaseFunds(0)).to.be.revertedWith(
      "Milestone not approved"
    );
  });
});