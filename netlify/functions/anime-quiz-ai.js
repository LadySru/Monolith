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
  }
};

// Anime list with difficulty ratings (1=easy, 5=hard)
const ANIME_LIST = [
  { title: "Naruto", difficulty: 1 },
  { title: "One Piece", difficulty: 1 },
  { title: "Demon Slayer", difficulty: 2 },
  { title: "Attack on Titan", difficulty: 2 },
  { title: "Death Note", difficulty: 3 },
  { title: "Steins;Gate", difficulty: 4 },
  { title: "Monster", difficulty: 5 },
];

function generateCharacterQuestion(animeTitle, animeDifficulty, animeData) {
  const characters = animeData.characters;
  if (!characters || characters.length === 0) return null;

  const targetCharacter = characters[Math.floor(Math.random() * characters.length)];
  const otherAnimes = ANIME_LIST.filter((t) => t.title !== animeTitle);

  const distractorNames = [];
  for (const otherAnime of otherAnimes) {
    const otherData = ANIME_DATABASE[otherAnime.title];
    if (otherData && otherData.characters && otherData.characters.length > 0) {
      const otherChar = otherData.characters[Math.floor(Math.random() * otherData.characters.length)];
      distractorNames.push(otherChar.name);
      if (distractorNames.length >= 3) break;
    }
  }

  const options = [targetCharacter.name, ...distractorNames.slice(0, 3)];
  const shuffled = options.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(targetCharacter.name);

  // Character questions are harder than plot questions (+1 difficulty)
  const difficulty = Math.min(5, animeDifficulty + 1);

  return {
    question: `This character: "${targetCharacter.description}" — which anime are they from?`,
    options: shuffled,
    correctIndex,
    difficulty,
    anime: animeTitle,
    explanation: `${targetCharacter.name} is a character from ${animeTitle}.`,
    type: "character",
  };
}

function generatePlotQuestion(animeTitle, animeDifficulty, animeData) {
  const plots = animeData.plots;
  if (!plots || plots.length === 0) return null;

  const targetPlot = plots[Math.floor(Math.random() * plots.length)];
  const otherAnimes = ANIME_LIST.filter((t) => t.title !== animeTitle);

  const distractorAnimes = [];
  for (const otherAnime of otherAnimes) {
    distractorAnimes.push(otherAnime.title);
    if (distractorAnimes.length >= 3) break;
  }

  const options = [animeTitle, ...distractorAnimes];
  const shuffled = options.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(animeTitle);

  return {
    question: `Which anime has this plot: "${targetPlot}"?`,
    options: shuffled,
    correctIndex,
    difficulty: animeDifficulty,
    anime: animeTitle,
    explanation: `This plot is from ${animeTitle}.`,
    type: "plot",
  };
}

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const questionCount = Math.min(body.count || 10, 50);

    // Generate questions from database
    const questions = [];

    for (let i = 0; i < questionCount; i++) {
      // Alternate between character and plot questions
      const questionType = i % 2 === 0 ? "plot" : "character";

      // Pick a random anime
      const anime = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
      const animeData = ANIME_DATABASE[anime.title];

      if (!animeData) continue;

      try {
        if (questionType === "character") {
          const question = generateCharacterQuestion(anime.title, anime.difficulty, animeData);
          if (question) questions.push(question);
        } else {
          const question = generatePlotQuestion(anime.title, anime.difficulty, animeData);
          if (question) questions.push(question);
        }
      } catch (error) {
        console.error(`Failed to generate question for ${anime.title}:`, error);
      }
    }

    // Sort questions from easiest to hardest
    questions.sort((a, b) => a.difficulty - b.difficulty);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    };
  } catch (error) {
    console.error("Quiz AI error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Failed to generate questions",
      }),
    };
  }
};
