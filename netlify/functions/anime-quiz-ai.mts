import type { Context, Config } from "@netlify/functions";
import { Anthropic } from "@anthropic-ai/sdk";

// Detailed anime knowledge base with specific plot points and characters
const ANIME_FACTS = {
  "Naruto": {
    characters: ["Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake"],
    facts: [
      "Naruto's village is the Hidden Leaf Village",
      "Naruto has the Nine-Tailed Fox sealed inside him",
      "Sasuke defects to join Orochimaru",
      "Kakashi has a Sharingan eye from Obito",
      "The final villain is Kaguya Otsutsuki"
    ]
  },
  "One Piece": {
    characters: ["Luffy", "Zoro", "Nami", "Usopp", "Sanji"],
    facts: [
      "Luffy's goal is to become King of the Pirates",
      "The One Piece is the legendary treasure",
      "Zoro wants to become the world's greatest swordsman",
      "Nami navigates using her weather-prediction skills",
      "The Straw Hat crew has 10 members"
    ]
  },
  "Death Note": {
    characters: ["Light Yagami", "L", "Misa Amane", "Near"],
    facts: [
      "Light Yagami finds a Death Note that kills anyone whose name is written in it",
      "L is a genius detective who opposes Light",
      "Misa is a Kira supporter and model",
      "Light becomes increasingly obsessed with godhood",
      "The series ends with Light's death"
    ]
  },
  "Monster": {
    characters: ["Kenzo Tenma", "Johan Liebert", "Nina Fortner"],
    facts: [
      "Tenma is a surgeon who saves a criminal's life",
      "Johan is the perfect monster - intelligent and manipulative",
      "The story spans across Europe following Tenma's investigation",
      "Nina is Johan's sister with amnesia",
      "The anime has 74 episodes"
    ]
  },
  "Steins;Gate": {
    characters: ["Rintaro Okabe", "Makise Kurisu", "Mayuri Shiina"],
    facts: [
      "Okabe invents the Phone Microwave for time travel",
      "Makise Kurisu is a genius scientist",
      "The story involves changing the timeline",
      "El Psy Kongroo is Okabe's catchphrase",
      "Mayuri's death is a key turning point"
    ]
  },
  "Attack on Titan": {
    characters: ["Eren Yeager", "Mikasa Ackerman", "Arwin Smith"],
    facts: [
      "Titans are giant humanoid creatures that eat humans",
      "Eren can transform into a Titan",
      "The walls protect humanity from Titans",
      "Mikasa has incredible combat skills",
      "The series reveals complex truth about the world"
    ]
  },
  "Demon Slayer": {
    characters: ["Tanjiro Kamado", "Nezuko Kamado", "Giyu Tomioka"],
    facts: [
      "Tanjiro's sister Nezuko becomes a demon but retains humanity",
      "Tanjiro trains under Giyu to become a Demon Slayer",
      "The Twelve Kizuki are powerful demons",
      "Tanjiro learns Water Breathing technique",
      "Muzan Kibutsuji is the first and strongest demon"
    ]
  },
  "Re:Zero": {
    characters: ["Subaru Emilia", "Rem", "Ram"],
    facts: [
      "Subaru can 'Return by Death' to change the past",
      "Emilia is a half-elf candidate to become next ruler",
      "Rem is a demon maid who falls in love with Subaru",
      "Ram is Rem's twin sister",
      "Subaru experiences traumatic timelines"
    ]
  },
  "Ergo Proxy": {
    characters: ["Re-l Mayer", "Vincent Law", "Pino"],
    facts: [
      "Re-l searches for the truth about the world",
      "Vincent is connected to Proxies - god-like beings",
      "The world is covered in radiation",
      "Pino is an android child",
      "The series is set in a post-apocalyptic world"
    ]
  },
  "Serial Experiments Lain": {
    characters: ["Lain Iwakura", "Arisu Mizuki", "Masayuki Iwakura"],
    facts: [
      "Lain is a god-like entity within the Wired",
      "The Wired is a virtual reality network",
      "Arisu is Lain's friend who commits suicide",
      "The series explores the nature of reality",
      "Lain becomes increasingly detached from the physical world"
    ]
  }
};

// Extended niche anime titles and facts database
const NICHE_ANIME_DB = {
  scifi: [
    { title: "Ergo Proxy", facts: ANIME_FACTS["Ergo Proxy"], difficulty: 4 },
    { title: "Serial Experiments Lain", facts: ANIME_FACTS["Serial Experiments Lain"], difficulty: 5 },
  ],
  psychological: [
    { title: "Monster", facts: ANIME_FACTS["Monster"], difficulty: 4 },
  ],
  action: [
    { title: "Attack on Titan", facts: ANIME_FACTS["Attack on Titan"], difficulty: 3 },
    { title: "Demon Slayer", facts: ANIME_FACTS["Demon Slayer"], difficulty: 2 },
  ],
  isekai: [
    { title: "Re:Zero", facts: ANIME_FACTS["Re:Zero"], difficulty: 3 },
  ],
  popular: [
    { title: "Naruto", facts: ANIME_FACTS["Naruto"], difficulty: 1 },
    { title: "One Piece", facts: ANIME_FACTS["One Piece"], difficulty: 1 },
    { title: "Death Note", facts: ANIME_FACTS["Death Note"], difficulty: 2 },
    { title: "Steins;Gate", facts: ANIME_FACTS["Steins;Gate"], difficulty: 3 },
  ],
};

interface UserKnowledge {
  [anime: string]: number; // 0-1 confidence level
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  anime: string;
  explanation: string;
}

export default async (req: Request, context: Context): Promise<Response> => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const body = (await req.json()) as {
      count?: number;
      userKnowledge?: UserKnowledge;
      difficulty?: string;
    };

    const questionCount = Math.min(body.count || 10, 50);
    const userKnowledge = body.userKnowledge || {};
    const requestedDifficulty = body.difficulty || "adaptive";

    // Initialize Anthropic client
    const client = new Anthropic();

    // Generate questions using Claude API
    const questions: QuizQuestion[] = [];

    // Select anime genres weighted by user knowledge gaps
    const genres = Object.keys(NICHE_ANIME_DB) as Array<
      keyof typeof NICHE_ANIME_DB
    >;
    const selectedGenres = selectGenresByKnowledge(
      genres,
      userKnowledge,
      questionCount
    );

    // Generate questions with Claude
    for (let i = 0; i < questionCount; i++) {
      const genre = selectedGenres[i % selectedGenres.length];
      const animeList = NICHE_ANIME_DB[genre];
      const anime = animeList[Math.floor(Math.random() * animeList.length)];

      // Determine difficulty based on user's knowledge
      const userConfidence = userKnowledge[anime.title] || 0.5;
      const recommendedDifficulty =
        requestedDifficulty === "adaptive"
          ? Math.max(1, Math.ceil((1 - userConfidence) * 5))
          : parseInt(requestedDifficulty) || 3;

      try {
        // Get anime facts if available
        const animeFacts = ANIME_FACTS[anime.title] || { characters: [], facts: [] };

        const response = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `You are a trivia master for the anime "${anime.title}".

HERE ARE THE KEY FACTS ABOUT THIS ANIME:
Characters: ${animeFacts.characters?.join(", ") || "Various"}
Plot Points: ${animeFacts.facts?.slice(0, 3).join(" | ") || "Various"}

CREATE A QUESTION that:
1. MUST ask about a CHARACTER NAME, PLOT POINT, or STORY EVENT from this specific anime
2. MUST use only facts from the anime's story
3. Difficulty level: ${recommendedDifficulty}/5

EXAMPLES OF GOOD QUESTIONS:
- "What is the main goal of [Character] in ${anime.title}?"
- "In ${anime.title}, [Character] can [ability/power]. What is this?"
- "What happens to [Character] in the climax of ${anime.title}?"

EXAMPLES OF BAD QUESTIONS (DO NOT CREATE THESE):
- "What is an anime opening?"
- "What does a light novel mean?"
- "What animation technique is used?"
- "[Studio name] produced ${anime.title}"
- "In what year was ${anime.title} released?"

Return ONLY this exact JSON format:
{
  "question": "question about ${anime.title}'s characters or plot",
  "options": ["answer A", "answer B", "answer C", "answer D"],
  "correctIndex": 0,
  "explanation": "why this is correct"
}`,
            },
          ],
        });

        const content = response.content[0];
        if (content.type === "text") {
          // Extract JSON from response
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const questionData = JSON.parse(jsonMatch[0]);
            questions.push({
              ...questionData,
              difficulty: recommendedDifficulty,
              anime: anime.title,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to generate question for ${anime.title}:`, error);
        // Fall back to a simple question
        questions.push(generateFallbackQuestion(anime, recommendedDifficulty));
      }
    }

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Quiz AI error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to generate questions",
      }),
      { status: 500 }
    );
  }
};

function selectGenresByKnowledge(
  genres: string[],
  knowledge: UserKnowledge,
  count: number
): string[] {
  // Weight genres by user's knowledge gaps
  const weightedGenres = genres.map((genre) => {
    const animeInGenre = NICHE_ANIME_DB[genre as keyof typeof NICHE_ANIME_DB];
    const avgKnowledge =
      animeInGenre.reduce(
        (sum, anime) => sum + (knowledge[anime.title] || 0),
        0
      ) / animeInGenre.length;

    // Higher weight for genres where user knows less
    const weight = 1 - avgKnowledge + Math.random() * 0.2;
    return { genre, weight };
  });

  // Sort by weight and select
  const selected = weightedGenres
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map((item) => item.genre);

  return selected.length > 0 ? selected : genres;
}

function generateFallbackQuestion(
  anime: Record<string, unknown>,
  difficulty: number
): QuizQuestion {
  const title = anime.title as string;
  const animeFacts = ANIME_FACTS[title];

  // If we have facts for this anime, create a question from them
  if (animeFacts && animeFacts.facts.length > 0) {
    const facts = animeFacts.facts;
    const characters = animeFacts.characters || [];

    // Create different question types
    const questionTypes = [
      {
        question: `In ${title}, who is a main character?`,
        options: characters.length > 0 ? characters.slice(0, 4) : ["Unknown"],
        correctIndex: 0,
        explanation: `${characters[0]} is a protagonist in ${title}.`,
      },
      {
        question: `What is a key plot point in ${title}? "${facts[0]}"`,
        options: [
          "That's correct",
          "That's about a different anime",
          "That was retconned",
          "That's fan fiction",
        ],
        correctIndex: 0,
        explanation: `This is indeed a major plot point in ${title}.`,
      },
      {
        question: `In ${title}, ${facts[Math.floor(Math.random() * facts.length)]} What happens next?`,
        options: [facts[1] || "The story continues", facts[2] || "Character development", "An unexpected twist", "Comedy relief"],
        correctIndex: 0,
        explanation: `Following this plot point, the story continues with important developments in ${title}.`,
      },
    ];

    const selectedQuestion = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    return {
      ...selectedQuestion,
      difficulty,
      anime: title,
    };
  }

  // Fallback for anime not in our database
  return {
    question: `${title} is an anime. True or False?`,
    options: ["True - it's a great anime series", "False - it's a manga only", "True - but it's not finished", "False - I've never heard of it"],
    correctIndex: 0,
    explanation: `${title} is indeed an anime series with memorable characters and plots.`,
    difficulty,
    anime: title,
  };
}

export const config: Config = {
  path: "/anime-quiz-ai",
};
