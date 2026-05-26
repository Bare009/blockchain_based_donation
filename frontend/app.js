let provider;
let signer;
let contract;
let connectedAddress = "";
let ownerAddress = "";
let verifierAddress = "";
let milestonesCache = [];

const elements = {
	campaignTitle: document.getElementById("campaign-title"),
	campaignDescription: document.getElementById("campaign-description"),
	campaignTarget: document.getElementById("campaign-target"),
	walletAddress: document.getElementById("wallet-address"),
	connectWallet: document.getElementById("connect-wallet"),
	donationAmount: document.getElementById("donation-amount"),
	donateBtn: document.getElementById("donate-btn"),
	statusMessage: document.getElementById("status-message"),
	totalDonated: document.getElementById("total-donated"),
	totalReleased: document.getElementById("total-released"),
	contractBalance: document.getElementById("contract-balance"),
	milestoneGrid: document.getElementById("milestone-grid"),
	donationHistory: document.getElementById("donation-history"),
	withdrawalHistory: document.getElementById("withdrawal-history"),
};

async function loadCampaignInfo() {
	try {
		const response = await fetch("campaign.json");
		const campaign = await response.json();
		elements.campaignTitle.textContent = campaign.title;
		elements.campaignDescription.textContent = campaign.description;
		elements.campaignTarget.textContent = campaign.targetAmount;
	} catch (error) {
		showStatus("Unable to load campaign info.", true);
	}
}

async function loadContractMetadata() {
	const addressResponse = await fetch("contract-address.json");
	const addressData = await addressResponse.json();
	const abiResponse = await fetch("contract-abi.json");
	const abi = await abiResponse.json();

	return { address: addressData.address, abi };
}

function showStatus(message, isError = false) {
	elements.statusMessage.textContent = message;
	elements.statusMessage.classList.toggle("error", isError);
}

function formatAddress(address) {
	if (!address) return "";
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(wei) {
	if (wei === undefined || wei === null) return "--";
	return `${ethers.formatEther(wei)} ETH`;
}

function formatTime(timestamp) {
	if (!timestamp) return "--";
	const date = new Date(Number(timestamp) * 1000);
	return date.toLocaleString();
}

function getStatusLabel(milestone) {
	if (milestone.released) return "Released";
	if (milestone.approved) return "Approved";
	if (milestone.submitted) return "Submitted";
	return "Pending";
}

function createMilestoneCard(milestone, index) {
	const card = document.createElement("div");
	card.className = "milestone-card";

	const status = getStatusLabel(milestone);

	card.innerHTML = `
		<div>
			<h3>${milestone.name}</h3>
			<p class="label">Release: ${milestone.releasePercent}%</p>
		</div>
		<span class="badge ${status.toLowerCase()}">${status}</span>
		<div class="actions" data-id="${index}"></div>
	`;

	const actions = card.querySelector(".actions");
	const isOwner = connectedAddress && connectedAddress === ownerAddress;
	const isVerifier = connectedAddress && connectedAddress === verifierAddress;

	if (status === "Pending" && isOwner) {
		const button = createActionButton("Submit Milestone", () =>
			submitMilestone(index)
		);
		actions.appendChild(button);
	}

	if (status === "Submitted" && isVerifier) {
		const button = createActionButton("Approve Milestone", () =>
			approveMilestone(index)
		);
		actions.appendChild(button);
	}

	if (status === "Approved" && isOwner) {
		const button = createActionButton("Release Funds", () =>
			releaseFunds(index)
		);
		actions.appendChild(button);
	}

	return card;
}

function createActionButton(label, handler) {
	const button = document.createElement("button");
	button.className = "btn ghost";
	button.textContent = label;
	button.addEventListener("click", handler);
	return button;
}

async function connectWallet() {
	if (!window.ethereum) {
		showStatus("MetaMask not detected. Please install it.", true);
		return;
	}

	try {
		showStatus("Connecting wallet...");
		await window.ethereum.request({ method: "eth_requestAccounts" });
		provider = new ethers.BrowserProvider(window.ethereum);
		signer = await provider.getSigner();
		connectedAddress = await signer.getAddress();
		elements.walletAddress.textContent = formatAddress(connectedAddress);

		const metadata = await loadContractMetadata();
		contract = new ethers.Contract(metadata.address, metadata.abi, signer);

		await loadContractData();
		showStatus("Wallet connected.");
	} catch (error) {
		showStatus("Wallet connection failed.", true);
	}
}

async function loadContractData() {
	if (!contract) return;

	try {
		const [totalDonated, totalReleased, balance, owner, verifier] =
			await Promise.all([
				contract.totalDonated(),
				contract.totalReleased(),
				contract.getBalance(),
				contract.owner(),
				contract.verifier(),
			]);

		ownerAddress = owner;
		verifierAddress = verifier;

		elements.totalDonated.textContent = formatEth(totalDonated);
		elements.totalReleased.textContent = formatEth(totalReleased);
		elements.contractBalance.textContent = formatEth(balance);

		const milestones = await contract.getMilestones();
		milestonesCache = milestones.map((item) => ({
			name: item.name,
			releasePercent: Number(item.releasePercent),
			submitted: item.submitted,
			approved: item.approved,
			released: item.released,
		}));

		renderMilestones();
		await renderDonations();
		await renderWithdrawals();
	} catch (error) {
		showStatus("Failed to load contract data.", true);
	}
}

async function renderDonations() {
	const donations = await contract.getDonations();
	const donationList = Array.from(donations || []);
	elements.donationHistory.innerHTML = "";

	if (donationList.length === 0) {
		elements.donationHistory.innerHTML =
			"<tr><td colspan=\"3\">No donations yet.</td></tr>";
		return;
	}

	donationList
		.slice()
		.reverse()
		.forEach((donation) => {
			const row = document.createElement("tr");
			const donor = donation.donor ?? donation[0];
			const amount = donation.amount ?? donation[1];
			const timestamp = donation.timestamp ?? donation[2];
			row.innerHTML = `
				<td>${formatAddress(donor)}</td>
				<td>${formatEth(amount)}</td>
				<td>${formatTime(timestamp)}</td>
			`;
			elements.donationHistory.appendChild(row);
		});
}

async function renderWithdrawals() {
	const withdrawals = await contract.getWithdrawals();
	const withdrawalList = Array.from(withdrawals || []);
	elements.withdrawalHistory.innerHTML = "";

	if (withdrawalList.length === 0) {
		elements.withdrawalHistory.innerHTML =
			"<tr><td colspan=\"3\">No withdrawals yet.</td></tr>";
		return;
	}

	withdrawalList
		.slice()
		.reverse()
		.forEach((withdrawal) => {
			const row = document.createElement("tr");
			const milestoneIndex =
				withdrawal.milestoneIndex ?? withdrawal[0] ?? 0;
			const amount = withdrawal.amount ?? withdrawal[1];
			const timestamp = withdrawal.timestamp ?? withdrawal[2];
			const milestoneName = milestonesCache[Number(milestoneIndex)]
				?.name;
			row.innerHTML = `
				<td>${milestoneName || `Milestone ${milestoneIndex}`}</td>
				<td>${formatEth(amount)}</td>
				<td>${formatTime(timestamp)}</td>
			`;
			elements.withdrawalHistory.appendChild(row);
		});
}

function renderMilestones() {
	elements.milestoneGrid.innerHTML = "";
	milestonesCache.forEach((milestone, index) => {
		elements.milestoneGrid.appendChild(createMilestoneCard(milestone, index));
	});
}

async function donate() {
	if (!contract) return;

	const amount = elements.donationAmount.value.trim();
	if (!amount || Number(amount) <= 0) {
		showStatus("Enter a valid donation amount.", true);
		return;
	}

	try {
		showStatus("Sending donation...");
		const tx = await contract.donate({ value: ethers.parseEther(amount) });
		await tx.wait();
		elements.donationAmount.value = "";
		await loadContractData();
		showStatus("Donation confirmed. Thank you!");
	} catch (error) {
		showStatus("Donation failed. Check MetaMask.", true);
	}
}

async function submitMilestone(id) {
	try {
		showStatus("Submitting milestone...");
		const tx = await contract.submitMilestone(id);
		await tx.wait();
		await loadContractData();
		showStatus("Milestone submitted.");
	} catch (error) {
		showStatus("Milestone submission failed.", true);
	}
}

async function approveMilestone(id) {
	try {
		showStatus("Approving milestone...");
		const tx = await contract.approveMilestone(id);
		await tx.wait();
		await loadContractData();
		showStatus("Milestone approved.");
	} catch (error) {
		showStatus("Milestone approval failed.", true);
	}
}

async function releaseFunds(id) {
	try {
		showStatus("Releasing funds...");
		const tx = await contract.releaseFunds(id);
		await tx.wait();
		await loadContractData();
		showStatus("Funds released.");
	} catch (error) {
		showStatus("Fund release failed.", true);
	}
}

elements.connectWallet.addEventListener("click", connectWallet);
elements.donateBtn.addEventListener("click", donate);

if (window.ethereum) {
	window.ethereum.on("accountsChanged", () => {
		connectWallet();
	});
}

loadCampaignInfo();
