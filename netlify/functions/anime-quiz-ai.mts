import type { Context, Config } from "@netlify/functions";
import { Anthropic } from "@anthropic-ai/sdk";

// Comprehensive anime database with character descriptions and plot summaries
const ANIME_DATABASE = {
  "Naruto": {
    characters: [
      { name: "Naruto Uzumaki", description: "A loud, energetic ninja from the Hidden Leaf Village who was ostracized as a child. Has the Nine-Tailed Fox sealed inside him and dreams of becoming Hokage." },
      { name: "Sasuke Uchiha", description: "A talented, cold ninja from the prestigious Uchiha clan who seeks revenge against his brother. Leaves the village to gain power." },
      { name: "Sakura Haruno", description: "An intelligent kunoichi with exceptional medical abilities. Member of Team 7 and has pink hair." },
      { name: "Kakashi Hatake", description: "A highly skilled ninja mentor known as the Copy Ninja. Has a Sharingan eye covered by his headband." }
    ],
    plots: [
      "A young ninja from a small village is ostracized by everyone due to a demon sealed within him. He dreams of becoming the leader of his village.",
      "A powerful demon attacks a village 16 years before the story begins. It is sealed into a newborn baby, making him hated by the villagers.",
      "A ninja seeks revenge against his older brother and is willing to betray his friends to gain the power needed for vengeance.",
      "Four ninjas train together in a team, bonding through countless battles and overcoming a series of increasingly dangerous threats."
    ]
  },
  "One Piece": {
    characters: [
      { name: "Luffy", description: "A rubber-powered pirate captain with an infectious laugh who dreams of finding the legendary treasure and becoming King of the Pirates." },
      { name: "Zoro", description: "A green-haired swordsman who wields three swords simultaneously. His dream is to become the world's greatest swordsman." },
      { name: "Nami", description: "A skilled navigator and cartographer with orange hair. She uses weather-based weapons and is obsessed with treasure and maps." },
      { name: "Sanji", description: "A blonde-haired cook who fights using only his legs. He protects the crew's food supplies at all costs." }
    ],
    plots: [
      "A man aspires to find a legendary treasure and become the ruler of all pirates, inspiring others to join his cause.",
      "A crew of misfits sails across a vast ocean, gathering members and battling powerful enemies to reach their shared dream.",
      "A young woman forced into slavery escapes and joins pirates to map the world and find freedom.",
      "A catastrophic war splits the world, creating three main powers that control the balance of the entire age."
    ]
  },
  "Death Note": {
    characters: [
      { name: "Light Yagami", description: "A brilliant high school student who finds a supernatural notebook that kills anyone whose name is written in it. He becomes corrupted by power." },
      { name: "L", description: "An eccentric detective with a massive intellect who investigates serial killings. He works in the shadows and is obsessed with sugar." },
      { name: "Misa Amane", description: "A model and actress who falls in love with a mass murderer. She makes a devil's bargain to help him." },
      { name: "Near", description: "A young detective who is L's successor. He has white hair and is tactically brilliant." }
    ],
    plots: [
      "A high school student gains the power to kill anyone by writing their name in a supernatural notebook. He uses this power to create a new world.",
      "A detective must stop a mysterious killer who leaves no evidence. The killer can eliminate anyone who threatens their plans.",
      "A god-like being decides humanity is corrupt and takes it upon himself to judge and execute those he deems guilty.",
      "A supernatural notebook falls to earth. Its first rule: anyone whose name is written in it dies within 40 seconds."
    ]
  },
  "Monster": {
    characters: [
      { name: "Kenzo Tenma", description: "A Japanese surgeon in Germany who saves a criminal's life, only to discover he created a monster. He spends years hunting down his mistake." },
      { name: "Johan Liebert", description: "A beautiful but emotionless man capable of manipulating anyone. He is considered the perfect monster created by unethical experiments." },
      { name: "Nina Fortner", description: "A girl with a mysterious past who may be connected to Johan. She has twin-like memories." }
    ],
    plots: [
      "A doctor saves a criminal's life, believing everyone deserves a second chance. Years later, he realizes his patient became a monster and hunts him across continents.",
      "A mysterious experiment created a perfect human being with no conscience. This being manipulates everyone around them for their own amusement.",
      "A surgeon must stop a serial killer while uncovering the truth about the killer's origins in a secret laboratory.",
      "A detective's investigation into serial murders leads to a disturbing conspiracy involving illegal human experimentation."
    ]
  },
  "Steins;Gate": {
    characters: [
      { name: "Rintaro Okabe", description: "An eccentric self-proclaimed mad scientist who invents a device to send messages to the past. He struggles with the consequences of changing time." },
      { name: "Makise Kurisu", description: "A brilliant young scientist who helps Okabe develop time-travel technology. She challenges Okabe's beliefs constantly." },
      { name: "Mayuri Shiina", description: "Okabe's childhood friend with a bubbly personality. Her repeated death becomes the central tragedy driving the story." }
    ],
    plots: [
      "A group of friends accidentally discover how to send messages to the past using a modified microwave. Changing history has severe consequences.",
      "A scientist must undo multiple timelines to save someone dear to him, but discovers each attempt creates a new tragedy.",
      "A conspiracy involving time travel forces ordinary people to become soldiers in an invisible war across multiple realities.",
      "A young man becomes trapped in a time loop, forced to witness the same tragic events repeatedly while searching for a way to change them."
    ]
  },
  "Attack on Titan": {
    characters: [
      { name: "Eren Yeager", description: "An angry, determined teen who vows to eliminate all Titans after his mother is eaten. He discovers he can transform into a Titan himself." },
      { name: "Mikasa Ackerman", description: "A stoic girl with gray eyes and black hair. She is Eren's devoted companion and an exceptionally skilled soldier." },
      { name: "Arwin Smith", description: "The strategic commander of the military with blonde hair. He holds many secrets about the world and pursues the truth relentlessly." }
    ],
    plots: [
      "Giant humanoid creatures called Titans attack humanity, which survives behind three massive walls. A teen seeks revenge against them.",
      "Mysterious walls protect humanity from extinction, but cracks appear, suggesting an even larger threat exists beyond them.",
      "A soldier with the ability to transform into a Titan joins the military to uncover the truth about the Titans' origins.",
      "A secret organization controls information about the outside world. A group of soldiers begins to question everything they've been taught."
    ]
  },
  "Demon Slayer": {
    characters: [
      { name: "Tanjiro Kamado", description: "A kind-hearted demon slayer with dark reddish hair and a burn mark on his forehead. His sister becomes a demon but retains her humanity." },
      { name: "Nezuko Kamado", description: "Tanjiro's sister who is transformed into a demon but retains her human consciousness. She is the only demon to never consume human flesh." },
      { name: "Giyu Tomioka", description: "A Water Breathing user and one of the nine Pillars. He saved Tanjiro and Nezuko and becomes an important mentor figure." }
    ],
    plots: [
      "A young man discovers his entire family slaughtered and his sister transformed into a demon. He vows to find a cure for her condition.",
      "A secret organization of elite swordsmen battles demons that plague humanity. A swordsman with a demon companion joins their ranks.",
      "An ancient demon awakens after centuries of slumber, forcing the strongest warriors to band together for a final battle.",
      "A teenager trains to master a specific breathing technique that grants him supernatural abilities to fight inhuman creatures."
    ]
  },
  "Psychological-Thriller-Mystery": {
    characters: [
      { name: "L Lawliet", description: "A mysterious detective who works in the shadows. Hunches folded, eating sweets constantly, and speaking in riddles." },
      { name: "Shinji Ikari", description: "A shy teenager forced to pilot a giant bio-mechanical creature to save the world. He constantly questions his worth." },
      { name: "Okabe Rintaro", description: "A self-proclaimed mad scientist who becomes paranoid after discovering time-travel conspiracies." }
    ],
    plots: [
      "A reclusive detective works in complete secrecy, communicating only through intermediaries while hunting a powerful criminal.",
      "A teenager is forced into military service piloting an experimental weapon. As the series progresses, reality becomes increasingly distorted.",
      "A group of friends discovers a time-travel conspiracy that forces them into a dangerous game where the stakes increase with each timeline."
    ]
  },
  "Sci-Fi-Dystopian": {
    characters: [
      { name: "Lain Iwakura", description: "A introverted girl who becomes a god-like entity within a virtual reality network. She gradually loses connection to reality." },
      { name: "Motoko Kusanagi", description: "A cyborg soldier with a fully synthetic body in a futuristic Japan. She questions what it means to be human." },
      { name: "Spike Spiegel", description: "A laid-back bounty hunter with one eye and a mysterious past. He drifts through space collecting bounties." }
    ],
    plots: [
      "A teenage girl discovers a virtual reality network called the Wired. As she explores it, she realizes the boundary between reality and virtual is blurring.",
      "An elite team of special operatives works in a futuristic Japan where nearly everyone is a cyborg. They struggle against corruption and identity.",
      "A small ragtag crew of misfits flies through space as bounty hunters, each carrying dark secrets from their past."
    ]
  },
  "Niche-Psychological": {
    characters: [
      { name: "Lain Iwakura", description: "A quiet, introverted girl with bowl-cut black hair. She gradually transforms into something transcendent and god-like." },
      { name: "Arisu Mizuki", description: "Lain's childhood friend who is vibrant and social. Her suicide becomes a pivotal moment in the story." },
      { name: "Johan Liebert", description: "A beautiful man with no capacity for empathy. He is called the 'perfect monster' by those around him." }
    ],
    plots: [
      "A girl's suicide triggers a chain of mysterious events involving an underground virtual network and existential questions about reality.",
      "A girl receives an invitation to a secret internet forum. Her identity begins to blur as she explores strange digital spaces.",
      "A teenage girl's classmate commits suicide, sparking an investigation into an underground internet community full of disturbing content."
    ]
  },
  "Shounen-Action": {
    characters: [
      { name: "Tanjiro Kamado", description: "A humble demon slayer with water-drop shaped pupils and dark reddish-burgundy hair. Extremely kind-hearted despite his tragedy." },
      { name: "Ichigo Kurosaki", description: "A orange-haired teenager who can see ghosts. He becomes a Soul Reaper to protect the living world from corrupted spirits." },
      { name: "Yuji Itadori", description: "A cheerful high schooler who swallows a cursed finger and becomes the vessel for a powerful demon." }
    ],
    plots: [
      "A young man trains to become stronger after a personal tragedy, climbing ranks and battling increasingly powerful opponents.",
      "A teenager discovers he can see supernatural beings and is suddenly thrust into a war between the spirit world and human world.",
      "A high schooler becomes the host of a powerful curse and must control it while fighting others like him in a deadly tournament."
    ]
  }
};

// Anime list for selection
const ANIME_LIST = [
  "Naruto",
  "One Piece",
  "Death Note",
  "Monster",
  "Steins;Gate",
  "Attack on Titan",
  "Demon Slayer"
];

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
  type: "character" | "plot"; // Question type
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

    // Generate questions from database
    const questions: QuizQuestion[] = [];

    for (let i = 0; i < questionCount; i++) {
      // Alternate between character and plot questions
      const questionType = i % 2 === 0 ? "character" : "plot";

      // Pick a random anime
      const animeTitle = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
      const animeData = ANIME_DATABASE[animeTitle];

      if (!animeData) continue;

      try {
        if (questionType === "character") {
          const question = generateCharacterQuestion(animeTitle, animeData);
          if (question) {
            questions.push(question);
          }
        } else {
          const question = generatePlotQuestion(animeTitle, animeData);
          if (question) {
            questions.push(question);
          }
        }
      } catch (error) {
        console.error(`Failed to generate question for ${animeTitle}:`, error);
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

function generateCharacterQuestion(
  animeTitle: string,
  animeData: Record<string, unknown>
): QuizQuestion | null {
  const characters = animeData.characters as Array<{ name: string; description: string }>;
  if (!characters || characters.length === 0) return null;

  // Pick a random character
  const targetCharacter = characters[Math.floor(Math.random() * characters.length)];
  const otherAnimes = ANIME_LIST.filter((t) => t !== animeTitle);

  // Get other character names for distractors
  const distractorNames: string[] = [];
  for (const otherAnime of otherAnimes) {
    const otherData = ANIME_DATABASE[otherAnime];
    if (otherData.characters && otherData.characters.length > 0) {
      const otherChar = (otherData.characters as Array<{ name: string }>)[
        Math.floor(Math.random() * otherData.characters.length)
      ];
      distractorNames.push(otherChar.name);
      if (distractorNames.length >= 3) break;
    }
  }

  const options = [targetCharacter.name, ...distractorNames.slice(0, 3)];
  const shuffled = options.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(targetCharacter.name);

  return {
    question: `This character: "${targetCharacter.description}" is from which anime?`,
    options: shuffled,
    correctIndex,
    difficulty: 3,
    anime: animeTitle,
    explanation: `${targetCharacter.name} is a character from ${animeTitle}.`,
    type: "character",
  };
}

function generatePlotQuestion(
  animeTitle: string,
  animeData: Record<string, unknown>
): QuizQuestion | null {
  const plots = animeData.plots as string[];
  if (!plots || plots.length === 0) return null;

  // Pick a random plot
  const targetPlot = plots[Math.floor(Math.random() * plots.length)];
  const otherAnimes = ANIME_LIST.filter((t) => t !== animeTitle);

  // Get other anime titles for distractors
  const distractorAnimes: string[] = [];
  for (const otherAnime of otherAnimes) {
    distractorAnimes.push(otherAnime);
    if (distractorAnimes.length >= 3) break;
  }

  const options = [animeTitle, ...distractorAnimes];
  const shuffled = options.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(animeTitle);

  return {
    question: `Which anime has this plot: "${targetPlot}"?`,
    options: shuffled,
    correctIndex,
    difficulty: 2,
    anime: animeTitle,
    explanation: `This plot is from ${animeTitle}.`,
    type: "plot",
  };
}

export const config: Config = {
  path: "/anime-quiz-ai",
};
