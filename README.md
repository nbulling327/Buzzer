# BuzzIn — Science Bowl Buzzer System

A real-time multiplayer buzzer app for Science Bowl (and similar quiz games). Up to 8 players join via a room code, pick a team (Red/Blue) and role (Captain / Person 1–3), then compete to buzz in first. The host sees who buzzed in and resets between questions.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express + Socket.io |
| Frontend | React (Create React App) |
| Realtime | WebSockets via Socket.io |

---

## Local Development

### Prerequisites
- Node.js 18+ installed

### 1. Install dependencies

```bash
# From the project root
npm install
cd server && npm install
cd ../client && npm install
```

Or use the helper script:
```bash
npm run install:all
```

### 2. Start both server and client

```bash
# From the project root — starts both concurrently
npm run dev
```

- **Server** runs on `http://localhost:3001`
- **Client** runs on `http://localhost:3000`

Open `http://localhost:3000` in two different browser windows/tabs to test — one as host, one as player.

---

## Deployment (Free / Cheap)

### Deploy the Server — Railway (recommended, free tier)

1. Push your project to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the repo, then set the **Root Directory** to `server`
4. Railway auto-detects Node.js and runs `npm start`
5. Copy the deployed URL (e.g. `https://your-server.up.railway.app`)

### Deploy the Client — Vercel (free)

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `client`
3. Add an **Environment Variable**:
   - Name: `REACT_APP_SERVER_URL`
   - Value: `https://your-server.up.railway.app` (your Railway URL from above)
4. Deploy — Vercel handles the build automatically

### Alternative: Deploy server to Render (also free)

1. [render.com](https://render.com) → New Web Service → Connect GitHub repo
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Free tier spins down after inactivity (takes ~30s to wake up on first request)

---

## How It Works

### Rooms
- Host creates a room and gets a 4-character code (e.g. `A7K2`)
- Up to 8 players join by entering the code
- Each player picks a team (Red/Blue) and role (Captain, Person 1, Person 2, Person 3)
- Role slots are unique per team — two players can't both be "Red Captain"

### Gameplay
1. Host moves from lobby to game view
2. Players see a big buzz button
3. First player to press it locks everyone else out
4. **All screens** immediately show the winner's name and team
5. Host presses **Reset** to clear the lock for the next question
6. Repeat

### Audio
- A distinct tone plays when someone buzzes in (different pitch for red vs blue team)
- Uses the browser Web Audio API — no external dependencies

---

## Project Structure

```
buzzer-app/
├── server/
│   ├── index.js          # Socket.io server, all game logic
│   └── package.json
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js             # Root component, all state + socket events
│   │   ├── socket.js          # Socket.io connection singleton
│   │   ├── index.css          # Global styles, CSS variables, animations
│   │   ├── components/
│   │   │   ├── UI.js          # Shared components (Logo, PlayerTag, etc.)
│   │   │   └── UI.css
│   │   └── screens/
│   │       ├── Landing.js/css       # Home — host or join
│   │       ├── JoinSetup.js/css     # Player setup (name/team/role)
│   │       ├── HostLobby.js/css     # Waiting room with player list
│   │       ├── HostGame.js/css      # Host in-game view
│   │       └── PlayerGame.js/css    # Player buzzer screen
│   └── package.json
└── package.json           # Root dev runner (concurrently)
```

---

## Customization Tips

**Change the room code length** — edit `generateRoomCode()` in `server/index.js`

**Add a score tracker** — in `HostGame.js`, add state for red/blue scores and buttons to +1 when the host confirms a correct answer

**Increase max players** — change the `>= 8` check in `server/index.js` to any number

**Add more roles** — edit the `ROLES` array in `JoinSetup.js` and `HostGame.js`

**Custom sounds** — replace the `playBuzz()` function in `App.js` with your own Web Audio synthesis or an `<audio>` element

---

## Browser Support

Works in all modern browsers (Chrome, Safari, Firefox, Edge). Optimized for mobile — the player buzz button is designed for phone use.
