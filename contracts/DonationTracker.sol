// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract DonationTracker {
	address public owner;
	address public verifier;
	uint public totalDonated;
	uint public totalReleased;

	struct Donation {
		address donor;
		uint amount;
		uint timestamp;
	}

	struct Milestone {
		string name;
		uint releasePercent;
		bool submitted;
		bool approved;
		bool released;
	}

	struct Withdrawal {
		uint milestoneIndex;
		uint amount;
		uint timestamp;
	}

	Donation[] public donations;
	Milestone[3] public milestones;
	Withdrawal[] public withdrawals;

	event DonationReceived(address indexed donor, uint amount, uint timestamp);
	event MilestoneSubmitted(uint indexed id);
	event MilestoneApproved(uint indexed id);
	event FundsReleased(uint indexed milestoneId, uint amount);

	modifier onlyOwner() {
		require(msg.sender == owner, "Not the owner");
		_;
	}

	modifier onlyVerifier() {
		require(msg.sender == verifier, "Not the verifier");
		_;
	}

	constructor(address _verifier) {
		owner = msg.sender;
		verifier = _verifier;

		milestones[0] = Milestone({
			name: "Beneficiary Registration",
			releasePercent: 30,
			submitted: false,
			approved: false,
			released: false
		});
		milestones[1] = Milestone({
			name: "Supplies Purchased and Distributed",
			releasePercent: 40,
			submitted: false,
			approved: false,
			released: false
		});
		milestones[2] = Milestone({
			name: "Final Report Submitted",
			releasePercent: 30,
			submitted: false,
			approved: false,
			released: false
		});
	}

	function donate() external payable {
		require(msg.value > 0, "Donation must be greater than 0");
		donations.push(Donation({
			donor: msg.sender,
			amount: msg.value,
			timestamp: block.timestamp
		}));
		totalDonated += msg.value;
		emit DonationReceived(msg.sender, msg.value, block.timestamp);
	}

	function submitMilestone(uint id) external onlyOwner {
		require(id < 3, "Invalid milestone");
		milestones[id].submitted = true;
		emit MilestoneSubmitted(id);
	}

	function approveMilestone(uint id) external onlyVerifier {
		require(id < 3, "Invalid milestone");
		require(milestones[id].submitted, "Milestone not submitted");
		require(!milestones[id].approved, "Already approved");
		milestones[id].approved = true;
		emit MilestoneApproved(id);
	}

	function releaseFunds(uint id) external onlyOwner {
		require(id < 3, "Invalid milestone");
		Milestone storage milestone = milestones[id];
		require(milestone.approved, "Milestone not approved");
		require(!milestone.released, "Already released");

		uint amount = (totalDonated * milestone.releasePercent) / 100;
		milestone.released = true;
		totalReleased += amount;
		withdrawals.push(Withdrawal({
			milestoneIndex: id,
			amount: amount,
			timestamp: block.timestamp
		}));

		(bool success, ) = payable(owner).call{value: amount}("");
		require(success, "Transfer failed");

		emit FundsReleased(id, amount);
	}

	function getDonations() external view returns (Donation[] memory) {
		return donations;
	}

	function getMilestones() external view returns (Milestone[3] memory) {
		return milestones;
	}

	function getWithdrawals() external view returns (Withdrawal[] memory) {
		return withdrawals;
	}

	function getBalance() external view returns (uint) {
		return address(this).balance;
	}
}
