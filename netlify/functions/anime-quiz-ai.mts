import type { Context, Config } from "@netlify/functions";
import { Anthropic } from "@anthropic-ai/sdk";

// Extended niche anime titles and facts database
const NICHE_ANIME_DB = {
  scifi: [
    { title: "Ergo Proxy", studio: "Manglobe", year: 2006, difficulty: 4 },
    { title: "Haibane Renmei", studio: "Radiix", year: 2002, difficulty: 4 },
    { title: "ABe", characters: "Nakamura Takashi", difficulty: 3 },
    { title: "Serial Experiments Lain", studio: "Triangle Staff", year: 1998, difficulty: 5 },
    { title: "Texhnolyze", studio: "Madhouse", year: 2003, difficulty: 4 },
    { title: "Natsume Yuujinchou", studio: "Brain's Base", difficulty: 2 },
  ],
  psychological: [
    { title: "Monster", creator: "Naoki Urasawa", episodes: 74, difficulty: 4 },
    { title: "Paranoia Agent", director: "Satoshi Kon", year: 2004, difficulty: 5 },
    { title: "The Tatami Galaxy", studio: "P.I.C.S", style: "rotoscope", difficulty: 4 },
    { title: "Perfect Blue", type: "film", director: "Satoshi Kon", year: 1997, difficulty: 5 },
  ],
  slice_of_life: [
    { title: "Nichijou", gags_per_episode: "200+", difficulty: 3 },
    { title: "K-On!", characters: 5, school: "Sakuragaoka", difficulty: 2 },
    { title: "Azuki Chan", episodes: 50, difficulty: 1 },
    { title: "Hidamari Sketch", art_style: "manga-like", difficulty: 2 },
  ],
  isekai: [
    { title: "Re:Zero", protagonist: "Subaru", ability: "Return by Death", difficulty: 3 },
    { title: "That Time I Got Reincarnated as a Spider", cgi: "heavy", difficulty: 2 },
    { title: "Sword Art Online", vr_game: "Aincrad", difficulty: 2 },
  ],
  horror: [
    { title: "Higurashi: When They Cry", arcs: 8, difficulty: 4 },
    { title: "Corpse Party", episodes: 4, ova: true, difficulty: 3 },
    { title: "Another", curse: "classroom", difficulty: 3 },
  ],
  avant_garde: [
    { title: "FLCL", director: "Kazuaki Takano", episodes: 6, difficulty: 5 },
    { title: "Paniponi Dash!", pace: "chaotic", difficulty: 5 },
    { title: "Pani Poni Dash", references: "heavy", difficulty: 4 },
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
        const response = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `Generate a trivia question about the anime "${anime.title}". The question should be difficulty level ${recommendedDifficulty}/5 (1=easy, 5=expert/niche knowledge).

              Return ONLY a JSON object with this exact structure:
              {
                "question": "The trivia question here",
                "options": ["option A", "option B", "option C", "option D"],
                "correctIndex": 0,
                "explanation": "Why this is correct and interesting trivia"
              }

              Make it interesting and educational. Vary between: plot details, character facts, production details, cultural references, and niche trivia.`,
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
  const questions = [
    {
      question: `Which studio produced "${title}"?`,
      options: [
        "MAPPA",
        "Madhouse",
        "Bones",
        "Ufotable",
      ],
      correctIndex: 1,
      explanation: `${title} is a notable anime production.`,
    },
    {
      question: `In what year was "${title}" released?`,
      options: [String(anime.year || 2000), "2001", "2002", "2003"],
      correctIndex: 0,
      explanation: `${title} aired in the late 1990s/2000s era.`,
    },
    {
      question: `"${title}" is primarily in which genre?`,
      options: [
        "Psychological Thriller",
        "Slice of Life",
        "Sci-Fi",
        "Horror",
      ],
      correctIndex: Math.floor(Math.random() * 4),
      explanation: `${title} is known for its unique storytelling.`,
    },
  ];

  const q = questions[Math.floor(Math.random() * questions.length)];
  return {
    ...q,
    difficulty,
    anime: title,
  };
}

export const config: Config = {
  path: "/anime-quiz-ai",
};
