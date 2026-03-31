import type { Context, Config } from "@netlify/functions";

interface UserAnswer {
  anime: string;
  correct: boolean;
  difficulty: number;
}

interface KnowledgeProfile {
  [anime: string]: {
    correctCount: number;
    totalAttempts: number;
    difficulty: number;
    lastUpdated: number;
    confidence: number; // 0-1
  };
}

interface LearningRecommendation {
  nextDifficulty: "easier" | "normal" | "harder";
  focusGenres: string[];
  strengths: string[];
  weaknesses: string[];
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method === "POST") {
    return handleRecordAnswer(req);
  } else if (req.method === "GET") {
    return handleGetProfile(req);
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
  });
};

async function handleRecordAnswer(req: Request): Promise<Response> {
  try {
    const { answers, userId } = (await req.json()) as {
      answers: UserAnswer[];
      userId: string;
    };

    if (!answers || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing answers or userId" }),
        { status: 400 }
      );
    }

    // Get current knowledge profile from blob storage
    const profile = await getOrCreateProfile(userId);

    // Update profile with new answers
    for (const answer of answers) {
      if (!profile[answer.anime]) {
        profile[answer.anime] = {
          correctCount: 0,
          totalAttempts: 0,
          difficulty: answer.difficulty,
          lastUpdated: Date.now(),
          confidence: 0.5,
        };
      }

      const anime = profile[answer.anime];
      anime.totalAttempts++;
      if (answer.correct) {
        anime.correctCount++;
      }

      // Update confidence based on performance
      anime.confidence = anime.totalAttempts > 0
        ? anime.correctCount / anime.totalAttempts
        : 0.5;

      // Adjust difficulty based on performance
      if (anime.confidence > 0.8 && anime.totalAttempts >= 3) {
        anime.difficulty = Math.min(5, anime.difficulty + 1);
      } else if (anime.confidence < 0.3 && anime.totalAttempts >= 2) {
        anime.difficulty = Math.max(1, anime.difficulty - 1);
      }

      anime.lastUpdated = Date.now();
    }

    // Save updated profile
    await saveProfile(userId, profile);

    // Generate learning recommendation
    const recommendation = generateRecommendation(profile);

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        recommendation,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error recording answers:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function handleGetProfile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      });
    }

    const profile = await getOrCreateProfile(userId);
    const recommendation = generateRecommendation(profile);

    return new Response(
      JSON.stringify({
        profile,
        recommendation,
        stats: calculateStats(profile),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error getting profile:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function getOrCreateProfile(userId: string): Promise<KnowledgeProfile> {
  try {
    // Try to get from localStorage key (client-side will handle blob storage)
    // For now, return empty profile
    const stored = globalThis.localStorage?.getItem(`anime_profile_${userId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

async function saveProfile(
  userId: string,
  profile: KnowledgeProfile
): Promise<void> {
  try {
    // This will be handled client-side with localStorage or IndexedDB
    // Server can optionally sync to Netlify Blobs if needed
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(
        `anime_profile_${userId}`,
        JSON.stringify(profile)
      );
    }
  } catch (error) {
    console.error("Error saving profile:", error);
  }
}

function generateRecommendation(profile: KnowledgeProfile): LearningRecommendation {
  const stats = calculateStats(profile);

  // Determine next difficulty
  let nextDifficulty: "easier" | "normal" | "harder" = "normal";
  if (stats.averageAccuracy > 0.8) {
    nextDifficulty = "harder";
  } else if (stats.averageAccuracy < 0.4) {
    nextDifficulty = "easier";
  }

  // Find genres with lowest confidence
  const genreConfidence = groupByGenre(profile);
  const sortedGenres = Object.entries(genreConfidence)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  const focusGenres = sortedGenres.map(([genre]) => genre);
  const weaknesses = sortedGenres.map(([, conf]) =>
    conf < 0.5 ? "Needs practice" : "Can improve"
  );

  // Strengths
  const strengths = Object.entries(genreConfidence)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([genre]) => genre);

  return {
    nextDifficulty,
    focusGenres,
    strengths,
    weaknesses,
  };
}

function calculateStats(profile: KnowledgeProfile): {
  totalAttempts: number;
  totalCorrect: number;
  averageAccuracy: number;
  totalAnimes: number;
} {
  const animes = Object.values(profile);
  const totalAttempts = animes.reduce((sum, a) => sum + a.totalAttempts, 0);
  const totalCorrect = animes.reduce((sum, a) => sum + a.correctCount, 0);

  return {
    totalAttempts,
    totalCorrect,
    averageAccuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
    totalAnimes: Object.keys(profile).length,
  };
}

function groupByGenre(profile: KnowledgeProfile): Record<string, number> {
  const genres: Record<string, number[]> = {
    "Sci-Fi": [],
    Psychological: [],
    "Slice of Life": [],
    Isekai: [],
    Horror: [],
    "Avant-Garde": [],
  };

  // Map anime to genres (simplified mapping)
  const animeToGenre: Record<string, string> = {
    "Ergo Proxy": "Sci-Fi",
    "Haibane Renmei": "Sci-Fi",
    "Serial Experiments Lain": "Psychological",
    Monster: "Psychological",
    "Paranoia Agent": "Psychological",
    "The Tatami Galaxy": "Psychological",
    "Perfect Blue": "Psychological",
    Nichijou: "Slice of Life",
    "K-On!": "Slice of Life",
    "Azuki Chan": "Slice of Life",
    "Hidamari Sketch": "Slice of Life",
    "Re:Zero": "Isekai",
    "That Time I Got Reincarnated as a Spider": "Isekai",
    "Sword Art Online": "Isekai",
    "Higurashi: When They Cry": "Horror",
    "Corpse Party": "Horror",
    Another: "Horror",
    FLCL: "Avant-Garde",
    "Paniponi Dash!": "Avant-Garde",
  };

  for (const [anime, stats] of Object.entries(profile)) {
    const genre = animeToGenre[anime] || "Other";
    if (!genres[genre]) genres[genre] = [];
    genres[genre].push(stats.confidence);
  }

  // Calculate average confidence per genre
  const result: Record<string, number> = {};
  for (const [genre, values] of Object.entries(genres)) {
    result[genre] =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0.5;
  }

  return result;
}

export const config: Config = {
  path: "/anime-knowledge",
};
