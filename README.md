# 🍿 P2P Cinema

**P2P Cinema** is an ultra-private, self-hosted WebRTC Watch Party platform. It allows you to broadcast 1080p 60fps video (movies, anime, games) directly to your friends' browsers using a Peer-to-Peer "Mesh" topology. 

Unlike mainstream streaming platforms (Discord, Kast, Teleparty), your video and chat data never touches a corporate server. It flows entirely from your computer to your friends' computers.

---

## 🚀 Quick Start (Docker)

The absolute easiest way to deploy P2P Cinema on your PC using Docker.

Run this single command in your terminal:
```bash
docker run -d \
  -p 3636:3636 \
  -e HOST_PASSWORD="YourSecurePassword" \
  --name p2p-cinema-server \
  systemzz1/p2p-cinema:latest
```

> ⚠️ **SECURITY WARNING:** You MUST replace `"YourSecurePassword"` with a real password. If you leave the `HOST_PASSWORD` blank, the container will intentionally crash on startup to prevent unauthorized users from hijacking your broadcast dashboard.

---

## 🔒 Connecting via ZeroTier (Ultimate Privacy)

To ensure your stream is completely private and accessible to friends outside your local network without doing complex Router Port-Forwarding, we highly recommend using **ZeroTier**.

### Step 1: Create a Private Network
1. Go to [ZeroTier.com](https://www.zerotier.com/) and create a free account.
2. Click **Create a Network**. You will be given a 16-character Network ID.
3. Install the ZeroTier app on your host machine and your friends' machines.
4. Have everyone click **Join Network** and enter the 16-character Network ID.

### Step 2: Authorize Your Friends
1. Go back to your ZeroTier dashboard.
2. Scroll down to the **Members** section and check the "Auth" box next to your friends' devices to let them into the private tunnel.
3. Find **your host machine's Managed IP Address** in that list (e.g., `10.**.230.***`).

### Step 3: Start the Movie Night!
Once the Docker container is running on your machine:
- **As the Host:** Open your browser and go to `http://localhost:3636/host`. Enter your `HOST_PASSWORD` to unlock the dashboard and start broadcasting.
- **For your Guests:** Tell your friends to open their browsers and navigate to your ZeroTier IP:
  👉 `http://10.**.230.***/theater` (Replace the IP with your actual ZeroTier IP).

---

## 🛠 Features
- **P2P Mesh WebRTC Engine:** Bypasses central servers; utilizes custom SDP Munging and forced Hardware Acceleration (H.264) for flawless high-motion streaming.
- **Dual Interface System:** Separate dashboards for the Host command center and the Guest viewing theater.
- **Dynamic Stream Buffering:** Automatically polls the internal video engine to eliminate startup glitching and smearing.
- **Synchronized Interactions:** Live room chat, floating emoji reactions, and a soundboard.
- **Mobile Responsive:** Works beautifully across desktop browsers and smartphone displays.

---

## 💻 Local Development
If you want to modify the source code instead of using Docker:
```bash
git clone https://github.com/your-repo/p2p-cinema.git
cd p2p-cinema
npm install
```
Create a `.env` file in the root directory:
```env
PORT=3636
HOST_PASSWORD=my_dev_password
```
Start the server:
```bash
npm start
```
