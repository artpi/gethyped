import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { OpenAI } from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});
const elevenlabs = new ElevenLabsClient({
	apiKey: process.env.ELEVENLABS_API_KEY
});


function readRandomPrompt() {
	const promptsDir = path.join(process.cwd(), "prompts");
	const promptFiles = fs.readdirSync(promptsDir);
	const randomFile = promptFiles[Math.floor(Math.random() * promptFiles.length)];
	const filePath = path.join(promptsDir, randomFile);
	const fileContent = fs.readFileSync(filePath, "utf8");
	const { data, content } = matter(fileContent);

	return {
		...data,
		id: randomFile,
		content: content.trim(),
	};
};


async function generateContent( prompt ) {
	try {
		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: "The speech you generate will be read out by speech generation models. so don't use any headings or titles.",
				},
				{
					role: "user",
					content: prompt.content,
				},
			],
		});

		return completion.choices[0].message.content.trim();
	} catch (error) {
		console.error("Error generating story:", error);
		return null;
	}
}

async function generateAudio( content, voice ) {
	const audio = await elevenlabs.generate({
		voice: voice,
		text: content,
		model_id: "eleven_turbo_v2_5"
	});

	return audio;
}

function saveEpisode( episode ) {
	const episodesPath = path.join(process.cwd(), "output", "episodes.json");
	const episodesData = fs.readFileSync(episodesPath, 'utf8');
	let episodes = JSON.parse(episodesData);
	episodes.push(episode);
	fs.writeFileSync(episodesPath, JSON.stringify(episodes, null, 2));
}

async function generateNewEpisode() {
	const prompt = readRandomPrompt();
	const content = await generateContent(prompt);
	const audio = await generateAudio(content, prompt.voice);
	const time = Date.now();
	const episode = {
		promptId: prompt.id,
		promptTitle: prompt.title,
		text: content,
		audioFile: `${prompt.id}-${time}.mp3`,
		time: time,
	};
	audio.pipe(fs.createWriteStream( path.join(process.cwd(), "output", episode.audioFile) ) );
	saveEpisode(episode);
	return episode;
}

generateNewEpisode();
