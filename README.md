# Gooner

Web dashboard for managing multiple Mineflayer Minecraft bots with real-time telemetry, movement control, animations, and remote command execution.

## Features

- **Web UI** — live bot telemetry (health, position, inventory), command center, console viewer, charts
- **Multi-bot control** — send commands to all bots or target individual bots by number
- **Animations** — orbit, follow, trick waves, star patterns, chain snake, spin, fly, and more
- **BedWars auto-join** — fully automated `/hub` → `/bw` loop with cooldown and lobby detection
- **Discord webhook logging** — per-bot log forwarding with rate limiting
- **Persistent bots** — auto-reconnect 10s after disconnect
- **Dark mode UI** — premium glass-morphism design

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Configuration

Edit `config.json`:

```json
{
  "mode": "b",
  "bot_count": 3,
  "bot_start": 1,
  "webhooks": ["https://discord.com/api/webhooks/..."]
}
```

| Key | Description |
|---|---|
| `mode` | `a` — login cycler, `b` — play controller (numbered), `c` — custom usernames |
| `bot_count` | Number of bots to spawn (Mode B) |
| `bot_start` | Starting number suffix for bot usernames |
| `webhooks` | Discord webhook URLs (round-robin per bot) |

Hardcoded options in `gooner.js`: server host, port, Minecraft version, bot prefix, login password.

## Modes

- **A** — Login cycler: connects each bot, sends `/login`, waits, disconnects, moves to next
- **B** — Play controller: spawns all bots simultaneously with full command system
- **C** — Play controller with custom username list

## Commands

All commands can be issued from the terminal or the web UI.

### Chat

Plain text entered in the terminal or web chat input is broadcast as in-game chat by all bots.

### Targeting

| Syntax | Targets |
|---|---|
| `!<cmd>` | All bots |
| `!bot <N> <cmd>` | Bot number N only (1-based) |

### Movement

`!forward [n]` `!back [n]` `!left [n]` `!right [n]` `!jump` `!sprint` `!sneak` `!shift [sec]` `!stop`

### Animations

| Command | Description |
|---|---|
| `!orbit <cx> <cz> <r> [spd] [facing]` | Circle a coordinate |
| `!forbit <user> <r> [spd] [facing]` | Orbit a player |
| `!trick1 <cx> <cz> <r> [amp] [spd] [facing]` | Orbiting wave |
| `!trick2 <cx> <cz> <r> [amp] [spd] [facing]` | Arm wave (fixed ring) |
| `!wjump <cx> <cz> <r> [h] [spd] [facing]` | Jump wave |
| `!star <cx> <cz> <outerR> [innerR] [spd] [facing]` | 5-pointed star path |
| `!follow <user> [r] [spd]` | Track a player |
| `!snake <user> <dist> [spd]` | Chain follow |
| `!fly up/down <blocks> [spd]` | Vertical movement |

Facing: `in`, `out`, or `tangent` (default).

### Utility

`!slot <1-9>` `!click left|right` `!lc` `!p` `!farm` `!gravity` `!spin [spd]` `!rotate` `!gui open|list|click|close` `!bw` `!all` `!near` `!chat` `!log`

## BedWars auto-join

`!bw` runs `/hub` → `/bw` until the bot lands in `bw-lobby-1`, handling cooldowns and wrong lobbies automatically.

## Project structure

```
├── server.js          # Express + Socket.IO server, API routes, bot interception
├── gooner.js    # Mineflayer bot controller (all bot logic + commands)
├── config.json        # Runtime configuration
├── public/
│   ├── index.html     # Web UI shell
│   ├── app.js         # Frontend logic (views, charts, real-time updates)
│   └── style.css      # Dark theme styling
└── package.json
```

## Requirements

- Node.js 16+
- Minecraft server (offline/cracked mode)

## License

MIT
