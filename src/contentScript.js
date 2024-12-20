import OpenRouterAPI from "./openRouterAPI";

let userGoals =
	"A computer science undergrad looking to learn about tech and CS. Show anything that is tech especially AI related and never approve content that is not related to those topics.";
let openrouterKey = "";
let PROBABILITY_CUTOFF = 70;

const ytContentSelectors = [
	"ytd-rich-item-renderer",
	"ytd-compact-video-renderer",
	"ytp-videowall-still",
];
const justRemove = ["ytp-endscreen-content", "ytp-ce-element"];

let api = null;

// Retrieve stored user goals and settings
chrome.storage.sync.get(
	["longTermGoals", "openrouterKey", "probabilityCutoff"],
	(res) => {
		if (res.longTermGoals && typeof res.longTermGoals === "string") {
			userGoals = res.longTermGoals;
		}
		if (res.openrouterKey && typeof res.openrouterKey === "string") {
			openrouterKey = res.openrouterKey;
		}
		if (typeof res.probabilityCutoff === "number") {
			PROBABILITY_CUTOFF = res.probabilityCutoff;
		}

		api = new OpenRouterAPI(openrouterKey);
		observeAndProcessElements();
		// monitorURLChanges(); // causes some bugs im too lazy to fix rn
	}
);

function observeAndProcessElements() {
	processElements();

	// Observe for new elements
	const observer = new MutationObserver(() => {
		processElements();
	});

	observer.observe(document.body, { childList: true, subtree: true });
}

function monitorURLChanges() {
	let lastURL = location.href;
	setInterval(() => {
		if (location.href !== lastURL) {
			console.log("URL changed");
			lastURL = location.href;
			processElements(true);
		}
	}, 2000);
}

async function processElements(ignoreCache = false) {
	if (ignoreCache) console.log("IGNORING CACHE");
	Array.from(document.querySelectorAll(justRemove.join(","))).forEach(
		(element) => element.remove()
	);

	const elements = Array.from(
		document.querySelectorAll(ytContentSelectors.join(","))
	);

	// Only process elements that haven't been processed yet

	for (const element of elements) {
		if (!element.dataset.scanned || ignoreCache) {
			element.dataset.scanned = "true";
			applyScanningPlaceholder(element);
			analyzeVideoElement(element);
		}
	}
}

function applyScanningPlaceholder(element) {
	// Create a placeholder overlay that covers the element
	const placeholder = document.createElement("div");
	placeholder.textContent = "Scanning...";
	placeholder.style.position = "absolute";
	placeholder.style.top = "0";
	placeholder.style.left = "0";
	placeholder.style.right = "0";
	placeholder.style.bottom = "0";
	placeholder.style.display = "flex";
	placeholder.style.justifyContent = "center";
	placeholder.style.alignItems = "center";
	placeholder.style.background = "rgba(0,0,0,1)";
	placeholder.style.color = "#fff";
	placeholder.style.zIndex = "9999";
	placeholder.style.fontSize = "18px";
	placeholder.className = "scanning-placeholder";

	// Positioning: Ensure the parent is positioned
	element.style.position = "relative";
	element.appendChild(placeholder);
}

async function analyzeVideoElement(element) {
	try {
		const data = extractVideoData(element);
		if (!data.title || !data.channelName) {
			// If we can't extract essential info, just remove placeholder (show anyway)
			removeScanningPlaceholder(element);
			return;
		}

		// Call the LLM
		const response = await api.analyzeVideo(
			userGoals,
			data.title,
			data.channelName
		);
		if (response && typeof response.probability === "number") {
			if (response.probability > PROBABILITY_CUTOFF) {
				// Good video, remove placeholder
				removeScanningPlaceholder(element);
			} else {
				// Keep placeholder, effectively hiding it
				changePlaceHolder(element);
			}
		} else {
			// On failure, show the video anyway (remove placeholder)
			changePlaceHolder(element, "API Failed");
		}
	} catch (err) {
		console.error("Error analyzing element:", err);
		changePlaceHolder(element, "Error analyzing video");
	}
}

function removeScanningPlaceholder(element) {
	const placeholder = element.querySelector(".scanning-placeholder");
	if (placeholder) {
		placeholder.remove();
	}
}

function changePlaceHolder(element, text) {
	const placeholder = element.querySelector(".scanning-placeholder");
	placeholder.textContent = text || "Brainrot Removed";
}

function extractVideoData(element) {
	let thumbnailURL = "";
	let videoID = "";
	let title = "";
	let channelName = "";

	const img = element.querySelector("img");
	if (img && img.src) {
		thumbnailURL = img.src;
	}

	let titleElement =
		element.querySelector("#video-title") ||
		element.querySelector("a#video-title") ||
		element.querySelector(".title a") ||
		element.querySelector(".title");

	if (titleElement) {
		title = titleElement.textContent.trim();
		const href = titleElement.getAttribute("href");
		if (href && href.includes("watch")) {
			const urlParams = new URLSearchParams(href.split("?")[1]);
			videoID = urlParams.get("v") || "";
		}
	}

	const channelElement =
		element.querySelector("#channel-name a") ||
		element.querySelector(".ytd-channel-name a") ||
		element.querySelector("#channel-name");
	if (channelElement) {
		channelName = channelElement.textContent.trim().split("\n")[0];
	}

	return { thumbnailURL, videoID, title, channelName };
}
