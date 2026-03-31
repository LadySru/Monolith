/**
 * ═══════════════════════════════════════════════════════════
 * DISCORD LIVE STATS & AVATAR
 * ───────────────────────────────────────────────────────────
 * Fetches and displays:
 * - Real-time server statistics (members, online)
 * - Live Discord server icon/avatar
 * Updates every 30 seconds
 * ═══════════════════════════════════════════════════════════
 */

class DiscordLiveStats {
  constructor() {
    this.updateInterval = 30000; // 30 seconds
    this.onlineEl = null;
    this.membersEl = null;
    this.avatarEls = [];
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

      // Find all avatar images to update
      this.avatarEls = document.querySelectorAll(
        ".nav-av, .footer-av, .hero-av, [alt*='avatar'], [alt*='Monolith']"
      );

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
      const { online, members, icon, name } = data;

      // Update stat counters
      if (this.onlineEl && online > 0) {
        this.onlineEl.innerHTML = `&#x1F7E2; ${online} Online`;
      }

      if (this.membersEl && members > 0) {
        this.membersEl.innerHTML = `&#x1F465; ${members} Members`;
      }

      // Update Discord server icon/avatar
      if (icon && this.avatarEls.length > 0) {
        this.avatarEls.forEach((el) => {
          if (el.tagName === "IMG") {
            el.src = icon;
            el.alt = name || "Monolith Social";
            el.title = name || "Monolith Social";
          }
        });
      }

      console.log(
        `Discord Updated: ${online} online, ${members} members, icon: ${icon ? "loaded" : "not available"}`
      );
    } catch (error) {
      console.warn("Discord stats error:", error);
      // Silently fail - keep showing fallback numbers and avatar
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
