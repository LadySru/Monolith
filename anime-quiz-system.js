/**
 * ═══════════════════════════════════════════════════════════
 * ANIME QUIZ AI SYSTEM
 * ───────────────────────────────────────────────────────────
 * Adaptive learning system for anime trivia with:
 * - Dynamic question generation via AI
 * - Difficulty adaptation based on performance
 * - Knowledge profile tracking per user
 * - Niche anime content
 * ═══════════════════════════════════════════════════════════
 */

class AnimeQuizAI {
  constructor(userId = null) {
    this.userId = userId || this.generateUserId();
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.answers = [];
    this.knowledgeProfile = {};
    this.recommendation = null;
    this.difficulty = "adaptive";
    this.init();
  }

  generateUserId() {
    let userId = localStorage.getItem("anime_quiz_user_id");
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("anime_quiz_user_id", userId);
    }
    return userId;
  }

  async init() {
    // Load user's knowledge profile
    await this.loadKnowledgeProfile();
  }

  async loadKnowledgeProfile() {
    try {
      const response = await fetch(`/.netlify/functions/anime-knowledge?userId=${this.userId}`);
      if (response.ok) {
        const data = await response.json();
        this.knowledgeProfile = data.profile || {};
        this.recommendation = data.recommendation || null;
      }
    } catch (error) {
      console.warn("Failed to load knowledge profile:", error);
      this.knowledgeProfile = {};
    }
  }

  /**
   * Generate new quiz questions with AI
   * @param {number} count - Number of questions to generate
   * @param {string} difficulty - 'easier', 'normal', 'harder', or 'adaptive'
   * @returns {Promise<Array>} Array of questions
   */
  async generateQuestions(count = 10, difficulty = "adaptive") {
    try {
      console.log("Generating questions with AI...");

      const response = await fetch("/.netlify/functions/anime-quiz-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          userKnowledge: this.knowledgeProfile,
          difficulty: difficulty === "adaptive" ? "adaptive" : parseInt(difficulty) || 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      this.questions = data.questions || [];
      this.currentIndex = 0;
      this.score = 0;
      this.answers = [];
      this.difficulty = difficulty;

      console.log(`Generated ${this.questions.length} questions`);
      return this.questions;
    } catch (error) {
      console.error("Failed to generate questions:", error);
      return this.generateFallbackQuestions(count);
    }
  }

  /**
   * Fallback questions if AI generation fails
   */
  generateFallbackQuestions(count = 10) {
    const fallbackQuestions = [
      {
        question: "What is the term for the closing animation sequence of an anime?",
        options: ["Opening", "Ending", "Outro", "Preview"],
        correctIndex: 1,
        difficulty: 1,
        anime: "General Knowledge",
        explanation: "The ending theme is played at the end of each episode.",
      },
      {
        question: "Which animation technique involves drawing each frame individually?",
        options: ["Digital Animation", "3D Animation", "Frame-by-Frame", "Motion Capture"],
        correctIndex: 2,
        difficulty: 2,
        anime: "Animation Basics",
        explanation: "Traditional anime uses frame-by-frame 2D animation.",
      },
      {
        question: "What is a 'light novel'?",
        options: ["A novel that's not heavy", "Japanese young adult fiction", "An e-book", "A short story"],
        correctIndex: 1,
        difficulty: 2,
        anime: "Anime Industry",
        explanation: "Light novels are a major source for anime adaptations.",
      },
    ];

    // Return repeated fallback if needed
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(fallbackQuestions[i % fallbackQuestions.length]);
    }
    this.questions = result;
    this.currentIndex = 0;
    return result;
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  /**
   * Record user answer and evaluate
   * @param {number} selectedIndex - Index of selected option
   * @returns {Object} Result with correct/incorrect and explanation
   */
  recordAnswer(selectedIndex) {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    const isCorrect = selectedIndex === question.correctIndex;
    if (isCorrect) this.score++;

    this.answers.push({
      anime: question.anime,
      correct: isCorrect,
      difficulty: question.difficulty,
      question: question.question,
      selectedIndex,
      correctIndex: question.correctIndex,
    });

    return {
      isCorrect,
      explanation: question.explanation,
      correctAnswer: question.options[question.correctIndex],
    };
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    this.currentIndex++;
    return this.currentIndex < this.questions.length;
  }

  /**
   * Check if quiz is complete
   */
  isComplete() {
    return this.currentIndex >= this.questions.length;
  }

  /**
   * Get final results
   */
  getResults() {
    const totalQuestions = this.questions.length;
    const percentage = (this.score / totalQuestions) * 100;

    const ranks = [
      { threshold: 0, label: "Beginner 🌱", message: "Keep watching and learning!", color: "#ff2d6b" },
      { threshold: 30, label: "Casual Viewer 📺", message: "Good knowledge! Keep it up.", color: "#ffd200" },
      { threshold: 50, label: "Seasoned Fan 🎌", message: "Impressive! You know your anime.", color: "#39ff8a" },
      { threshold: 70, label: "Anime Expert ⭐", message: "Outstanding knowledge!", color: "#00ffe7" },
      { threshold: 90, label: "Anime God 🏆", message: "You are a true legend!", color: "#8b2fff" },
    ];

    const rank = ranks.reverse().find((r) => percentage >= r.threshold) || ranks[0];

    return {
      score: this.score,
      totalQuestions,
      percentage,
      rank: rank.label,
      message: rank.message,
      color: rank.color,
    };
  }

  /**
   * Submit results to learning system
   */
  async submitResults() {
    try {
      const response = await fetch("/.netlify/functions/anime-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          answers: this.answers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.knowledgeProfile = data.profile || {};
        this.recommendation = data.recommendation || null;
        console.log("Results submitted and profile updated");
        return data;
      }
    } catch (error) {
      console.error("Failed to submit results:", error);
    }

    return null;
  }

  /**
   * Get learning recommendations
   */
  getRecommendations() {
    if (!this.recommendation) return null;

    return {
      nextDifficulty: this.recommendation.nextDifficulty,
      focusAreas: this.recommendation.focusGenres,
      strengths: this.recommendation.strengths,
      message: this.generateRecommendationMessage(),
    };
  }

  generateRecommendationMessage() {
    if (!this.recommendation) return "";

    const { nextDifficulty } = this.recommendation;
    const messages = {
      harder: "You're doing great! Try harder questions next time.",
      normal: "Keep practicing with medium difficulty questions.",
      easier: "Build your foundation with easier questions first.",
    };

    return messages[nextDifficulty] || messages.normal;
  }

  /**
   * Get learning statistics
   */
  getStats() {
    const totalAttempts = Object.values(this.knowledgeProfile).reduce(
      (sum, profile) => sum + (profile.totalAttempts || 0),
      0
    );
    const totalCorrect = Object.values(this.knowledgeProfile).reduce(
      (sum, profile) => sum + (profile.correctCount || 0),
      0
    );

    return {
      totalQuizzes: Object.keys(this.knowledgeProfile).length,
      totalAttempts,
      totalCorrect,
      overallAccuracy: totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(1) : 0,
      knowledge: this.knowledgeProfile,
    };
  }

  /**
   * Reset quiz (start over)
   */
  reset() {
    this.currentIndex = 0;
    this.score = 0;
    this.answers = [];
    this.questions = [];
  }
}

// Export for use in quiz.html
if (typeof module !== "undefined" && module.exports) {
  module.exports = AnimeQuizAI;
}
