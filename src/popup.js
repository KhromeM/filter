document.addEventListener("DOMContentLoaded", async () => {
	const goalsInput = document.getElementById("goals");
	const keyInput = document.getElementById("openrouter-key");
	const cutoffSlider = document.getElementById("cutoff");
	const cutoffValueSpan = document.getElementById("cutoff-value");
	const saveBtn = document.getElementById("save-btn");

	// Load existing data
	chrome.storage.sync.get(
		["longTermGoals", "openrouterKey", "probabilityCutoff"],
		(res) => {
			if (res.longTermGoals) {
				goalsInput.value = res.longTermGoals;
			}
			if (res.openrouterKey) {
				keyInput.value = res.openrouterKey;
			}
			if (typeof res.probabilityCutoff === "number") {
				cutoffSlider.value = res.probabilityCutoff;
				cutoffValueSpan.textContent = res.probabilityCutoff;
			}
		}
	);

	cutoffSlider.addEventListener("input", () => {
		cutoffValueSpan.textContent = cutoffSlider.value;
	});

	async function verifyKey(key) {
		try {
			const resp = await fetch("https://openrouter.ai/api/v1/models", {
				headers: {
					Authorization: `Bearer ${key}`,
				},
			});
			if (!resp.ok) throw new Error("Non-200 response");
			return true;
		} catch (err) {
			return false;
		}
	}

	// Save data
	saveBtn.addEventListener("click", async () => {
		const key = keyInput.value.trim();
		const goals =
			goalsInput.value.trim() ||
			"A computer science undergrad looking to learn about tech and CS.";
		const cutoff = parseInt(cutoffSlider.value, 10);

		if (!key) {
			alert("Please enter a valid OpenRouter key.");
			return;
		}

		const keyValid = await verifyKey(key);
		if (!keyValid) {
			alert("Invalid OpenRouter key. Please check and try again.");
			return;
		}

		chrome.storage.sync.set(
			{ openrouterKey: key, longTermGoals: goals, probabilityCutoff: cutoff },
			() => {
				alert("Settings saved!");
			}
		);
	});
});
