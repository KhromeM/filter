import OpenAI from "openai";
import { z } from "zod";

const MODEL = "google/gemini-flash-1.5";
const responseSchema = z.object({
	probability: z.number().min(0).max(100),
	// explanation: z.string().min(1),
});

export default class OpenRouterAPI {
	constructor(apiKey) {
		this.apiKey = apiKey;
		this.openai = new OpenAI({
			baseURL: "https://openrouter.ai/api/v1",
			apiKey: apiKey,
			dangerouslyAllowBrowser: true,
		});
	}

	cleanJsonResponse(response) {
		let cleaned = response
			.replace(/```json\n/g, "")
			.replace(/```/g, "")
			.trim();
		cleaned = cleaned.replace(/^\n+/, "");
		if (cleaned.includes("}{")) {
			cleaned = cleaned.split("}{")[0] + "}";
		}
		return cleaned;
	}

	async analyzeVideo(userGoals, videoTitle, channelName) {
		const prompt = `You are analyzing a YouTube video for a user who wants to ${userGoals}.
The video title is "${videoTitle}" and the channel name is "${channelName}".
Estimate the probability (0-100%) that this video will help the user achieve their goals and not waste their time.
Provide a "probability" as a number.

EXAMPLE RESPONSE:
{
    "probability": 85
}`;

		try {
			const completion = await this.openai.chat.completions.create({
				model: MODEL,
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 1,
				max_tokens: 20,
				response_format: responseSchema,
			});

			const messageContent = completion.choices[0].message.content;
			const cleanedResponse = this.cleanJsonResponse(messageContent);
			console.log(videoTitle, channelName, messageContent);
			const response = JSON.parse(cleanedResponse);
			const validatedResponse = responseSchema.parse(response);
			return validatedResponse;
		} catch (error) {
			console.error("Error analyzing video:", error);
			return null;
		}
	}
}
