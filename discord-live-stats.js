/**
 * ═══════════════════════════════════════════════════════════
 * DISCORD LIVE STATS
 * ───────────────────────────────────────────────────────────
 * Fetches and displays real-time Discord server statistics
 * Updates every 30 seconds with live member/online counts
 * ═══════════════════════════════════════════════════════════
 */

class DiscordLiveStats {
  constructor() {
    this.updateInterval = 30000; // 30 seconds
    this.onlineEl = null;
    this.membersEl = null;
    this.init();
  }

  init() {
    // Find the stat elements
    const serverStats = document.querySelectorAll(
      ".server-online, .server-members"
    );

    if (serverStats.length > 0) {
      // Store references to update
      serverStats.forEach((el) => {
        if (el.classList.contains("server-online")) {
          this.onlineEl = el;
        } else if (el.classList.contains("server-members")) {
          this.membersEl = el;
        }
      });

      // Fetch immediately on load
      this.updateStats();

      // Then update every 30 seconds
      setInterval(() => this.updateStats(), this.updateInterval);
    }
  }

  async updateStats() {
    try {
      const response = await fetch("/.netlify/functions/discord-stats");

      if (!response.ok) {
        console.warn("Failed to fetch Discord stats:", response.status);
        return;
      }

      const data = await response.json();
      const { online, members } = data;

      // Update DOM with live counts
      if (this.onlineEl && online > 0) {
        this.onlineEl.innerHTML = `&#x1F7E2; ${online} Online`;
      }

      if (this.membersEl && members > 0) {
        this.membersEl.innerHTML = `&#x1F465; ${members} Members`;
      }

      console.log(`Discord Stats Updated: ${online} online, ${members} members`);
    } catch (error) {
      console.warn("Discord stats error:", error);
      // Silently fail - keep showing fallback numbers
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new DiscordLiveStats();
  });
} else {
  new DiscordLiveStats();
}
