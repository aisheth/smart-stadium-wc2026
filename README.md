# SmartStadium - FIFA World Cup 2026 Companion App

Welcome to **SmartStadium**, the official AI-powered companion application designed for the FIFA World Cup 2026. This app is built to provide fans with a seamless, safe, and engaging match-day experience.

## 🌟 Key Features

### 1. 🤖 AI Chatbot Assistant
- A smart chatbot ready to answer your questions about the stadium, parking, match rules, and more.
- **Developer Mode**: In the Settings menu, you can input your own Google Gemini API key to enable real-time, dynamic AI responses.

### 2. 🗺️ Interactive Wayfinding & Navigation
- **Find My Seat**: Navigate the stadium efficiently with a built-in map.
- Search for specific facilities such as gates, food & drink stalls, restrooms, and medical centers.
- Generates turn-by-turn directions and estimated walking times.

### 3. 🎟️ Digital Ticketing & Wallet
- **My Tickets**: Securely store your match tickets. Features a QR code scanner for fast, contactless entry at the gates.
- **Match Schedule**: Keep track of live matches, scores, upcoming games, and stadium locations.
- **Fan Zone**: Discover activities happening around the venue (live music, face painting, fan shops, etc.) and navigate to them instantly.

### 4. 📊 Live Crowd Congestion & AI Predictions
- Monitor real-time crowd density across different stadium zones (e.g., Gate A, North Concourse, Food Court).
- View AI-generated predictions for expected congestion in the next 15-30 minutes, helping you plan the best time to grab a snack or use the restroom.

### 5. 🚨 Emergency & Safety Hub
- **SOS Button**: A quick-access emergency button (hold for 2 seconds) to immediately notify staff of your location.
- **Lost & Found**: Easily report lost items, found items, or missing persons (urgent priority).
- **Emergency Contacts**: Quick access to stadium security, medical assistance, and police.
- **Live Overlays**: Receives broadcast emergency alerts directly on the screen.

### 6. 🌐 Accessibility & Internationalization (i18n)
- **Multi-Language Support**: Fully translated into 10 languages (English, Spanish, French, German, Arabic, Japanese, Korean, Portuguese, Hindi, Chinese) to accommodate fans from around the world.
- Responsive design tailored for mobile web.

## 🎨 Theme & Design
The application features a premium, fiery football-centric theme designed specifically for the World Cup:
- **Pitch-Green Base Scheme**: Immersive dark green background tones.
- **Neon & Fire Accents**: Striking bright green (`#39FF14`) and fiery orange/red (`#FF5500`) highlights.
- **Dynamic Backgrounds**: Glowing neon soccer pitch aesthetics rendered dynamically via CSS gradients.

## 🚀 How to Run Locally

This is a lightweight, frontend-only Web App. No complex build tools are required!

1. Clone or download the repository.
2. Open the project folder.
3. Serve the directory using any local web server. For example, if you have Python installed:
   ```bash
   python -m http.server 8000
   ```
4. Open your browser and navigate to `http://localhost:8000`.

## ⚙️ Developer Settings
To unlock the true power of the AI Chat Assistant:
1. Open the **Settings** menu (gear icon in the top right).
2. Enter your Google Gemini API key in the **Developer Mode** section.
3. Navigate back to the home screen and interact with the AI assistant!

*Note: Your API key is stored securely in your browser's local storage and is never sent anywhere other than Google's Gemini API endpoints.*
