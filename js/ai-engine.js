/**
 * @fileoverview Smart AI Engine — Intent Detection & Response Generation
 * Demo mode: rich knowledge-base responses without external API
 * Architecture: classify intent → extract entities → generate contextual response
 * Supports: upgrade to real Gemini API by setting window.GEMINI_API_KEY
 */

'use strict';

const AIEngine = (() => {

  /* =========================================================================
   * INTENT DEFINITIONS
   * ========================================================================= */
  const INTENTS = {
    NAVIGATION:   'navigation',
    SEATING:      'seating',
    FOOD:         'food',
    RULES:        'rules',
    SCHEDULE:     'schedule',
    TRANSPORT:    'transport',
    EMERGENCY:    'emergency',
    MEDICAL:      'medical',
    ACCESSIBILITY:'accessibility',
    WIFI:         'wifi',
    LOST:         'lost',
    WEATHER:      'weather',
    TICKETS:      'tickets',
    FANZONE:      'fanzone',
    PLAYERS:      'players',
    SUSTAINABILITY: 'sustainability',
    STAFF:        'staff',
    GREETING:     'greeting',
    THANKS:       'thanks',
    GENERAL:      'general'
  };

  /* =========================================================================
   * INTENT PATTERNS (multilingual keyword matching)
   * ========================================================================= */
  const PATTERNS = [
    {
      intent: INTENTS.SUSTAINABILITY,
      patterns: [/sustainab|eco|green|recycle|carbon|offset|emission|environment|climate|footprint/i]
    },
    {
      intent: INTENTS.STAFF,
      patterns: [/staff ops mode|enable staff mode|operational intelligence|crowd deployment/i]
    },
    {
      intent: INTENTS.GREETING,
      patterns: [/^(hi|hello|hey|hola|bonjour|ciao|hallo|こんにちは|안녕|नमस्ते|مرحبا|oi|olá)\b/i]
    },
    {
      intent: INTENTS.THANKS,
      patterns: [/thank|thanks|merci|gracias|grazie|danke|ありがとう|감사|धन्यवाद|شكرا|obrigado/i]
    },
    {
      intent: INTENTS.SEATING,
      patterns: [/seat|section|row|block|stand|tribune|asiento|siège|posto|sitz|席|좌석|सीट|مقعد/i,
                 /where.*(?:my|sit)|find.*seat|get to.*section/i]
    },
    {
      intent: INTENTS.NAVIGATION,
      patterns: [/where|how.*get|direction|navigate|find|way to|path|route|located|nearest|closest|baño|toilette|ausgang|dov|どこ|어디|कहां|أين/i,
                 /gate|exit|entrance|concourse|concession|elevator|lift|escalator|stair/i]
    },
    {
      intent: INTENTS.FOOD,
      patterns: [/food|eat|drink|menu|restaurant|snack|burger|hot dog|pizza|beer|nachos|halal|vegetarian|vegan|gluten|cafe|concession|beverage|hungry|thirsty/i,
                 /comida|manger|nourriture|essen|cibo|食べ|먹|खाना|طعام|almoco|jantar/i]
    },
    {
      intent: INTENTS.RULES,
      patterns: [/rule|regulation|offside|foul|card|yellow|red|var|penalty|substitut|law of.*game|how.*play|allowed|prohibited|banned|forbidden/i,
                 /regla|règle|regel|regola|ルール|규칙|नियम|قاعدة/i]
    },
    {
      intent: INTENTS.SCHEDULE,
      patterns: [/match|game|fixture|schedule|when.*play|kickoff|kick.off|halftime|half.time|final|quarter|semi|group stage|result|score|standing/i,
                 /partido|match|spiel|partita|試合|경기|मैच|مباراة/i]
    },
    {
      intent: INTENTS.TRANSPORT,
      patterns: [/transport|bus|metro|subway|train|parking|car|taxi|uber|lyft|ride|shuttle|drive|arrive|get here|how.*come/i,
                 /transporte|transport|verkehr|trasporto|交通|교통|परिवहन|مواصلات/i]
    },
    {
      intent: INTENTS.EMERGENCY,
      patterns: [/emergency|sos|help.*urgent|danger|fire|evacuate|disaster|evacuation|alarm|panic/i]
    },
    {
      intent: INTENTS.MEDICAL,
      patterns: [/medical|doctor|nurse|first aid|hurt|injured|injury|sick|ill|faint|ambulance|hospital|pain|unwell/i,
                 /médico|médecin|arzt|medico|医療|의료|चिकित्सा|طبي/i]
    },
    {
      intent: INTENTS.ACCESSIBILITY,
      patterns: [/wheelchair|accessible|disability|disabled|blind|deaf|mobility|assistance|special need|elevator.*wheelchair|ramp/i,
                 /accessib|barrierefreiheit|accesso|アクセシビリティ|접근성|सुगम्य|إمكانية الوصول/i]
    },
    {
      intent: INTENTS.WIFI,
      patterns: [/wifi|wi-fi|internet|network|connection|connect|signal|data|online/i]
    },
    {
      intent: INTENTS.LOST,
      patterns: [/lost|missing|can't find|lost child|missing child|lost.*item|found.*item|lost.*wallet|lost.*phone|lost.*bag/i,
                 /perdido|perdu|verloren|smarrito|紛失|분실|खोया|مفقود/i]
    },
    {
      intent: INTENTS.WEATHER,
      patterns: [/weather|temperature|rain|sun|hot|cold|forecast|clima|météo|wetter|tempo|天気|날씨|मौसम|طقس/i]
    },
    {
      intent: INTENTS.TICKETS,
      patterns: [/ticket|entry|scan|qr|code|admission|gate|entry|pass|credential|badge/i]
    },
    {
      intent: INTENTS.FANZONE,
      patterns: [/fan zone|fanzone|activity|activities|event|things to do|entertainment|store|shop|merchandise|trophy|photo|experience/i]
    },
    {
      intent: INTENTS.PLAYERS,
      patterns: [/mbappe|mbappé|yamal|haaland|vini|vinicius|bellingham|ronaldo|messi|player|squad|team|lineup|eleven|starting/i]
    }
  ];

  /* =========================================================================
   * ENTITY EXTRACTORS
   * ========================================================================= */

  /**
   * Extract seat/section information from user query
   * @param {string} text
   * @returns {{ section: string|null, row: string|null, seat: string|null }}
   */
  function extractSeatInfo(text) {
    const sectionMatch = text.match(/section\s+(\w+)/i) || text.match(/sec\s*\.?\s*(\w+)/i);
    const rowMatch     = text.match(/row\s+([a-z\d]+)/i);
    const seatMatch    = text.match(/seat\s+(\d+)/i) || text.match(/#\s*(\d+)/);
    return {
      section: sectionMatch?.[1] || null,
      row:     rowMatch?.[1] || null,
      seat:    seatMatch?.[1] || null
    };
  }

  /**
   * Extract facility type from query
   * @param {string} text
   * @returns {string|null}
   */
  function extractFacility(text) {
    const lc = text.toLowerCase();
    if (/toilet|restroom|bathroom|wc|loo|baño/.test(lc)) return 'restroom';
    if (/food|eat|concession|snack/.test(lc)) return 'food';
    if (/medical|first.?aid|doctor/.test(lc)) return 'medical';
    if (/gate|entrance|exit/.test(lc)) return 'gate';
    if (/elevator|lift/.test(lc)) return 'elevator';
    if (/atm|cash/.test(lc)) return 'atm';
    if (/parking/.test(lc)) return 'parking';
    return null;
  }

  /* =========================================================================
   * RESPONSE GENERATORS
   * ========================================================================= */

  const RESPONSES = {

    [INTENTS.SUSTAINABILITY]: () => {
      return `🌱 **SmartStadium Eco-Hub**\n\nDid you know? Taking the Metro today saves approximately **2.4kg of CO2** compared to driving!\n\n**Recycling:**\n• Look for the Green Bins (mixed recycling) and Blue Bins (compost/food waste) every 50 meters.\n• We use 100% biodegradable cups.\n\n**Carbon Offset:**\nIf you flew here, you can offset your flight using the FIFA Green Goal program.\n\nThank you for helping make WC 2026 the greenest World Cup ever! 🌍`;
    },

    [INTENTS.STAFF]: () => {
      return `🔐 **STAFF OPS MODE ENABLED**\n\n**Real-time Insights (Zone: North Concourse)**\n🚨 **Alert**: Crowd density approaching 85% at Gate A (Expected delay: 15 mins).\n\n**AI Recommendation:**\n• Redirect incoming fans to Gate B (Currently at 30% capacity).\n• Deploy 2 additional wayfinding volunteers to Section 105 junction.\n• Pre-warn concessions at Section 110 of incoming surge.\n\n*Type "exit staff mode" to return to fan view.*`;
    },

    [INTENTS.GREETING]: () => {
      const greetings = [
        `${I18n.t('chat.greeting')}`,
        `¡Welcome to FIFA World Cup 2026! 🏆⚽ I'm your SmartStadium AI — ask me about seats, food, directions, rules, safety, or anything stadium-related!`,
        `Good to see you! I'm here to make your World Cup experience unforgettable. What can I help with today? 🌟`
      ];
      return Utils.randItem(greetings);
    },

    [INTENTS.THANKS]: () => {
      return Utils.randItem([
        '🏆 You\'re very welcome! Enjoy the match — it\'s going to be incredible! Is there anything else I can help with?',
        'Happy to help! ⚽ Go enjoy the game! Any other questions?',
        'My pleasure! 😊 Feel free to ask anytime. Have an amazing World Cup experience!'
      ]);
    },

    [INTENTS.SEATING]: (text) => {
      const info = extractSeatInfo(text);
      if (info.section) {
        return `📍 **Getting to Section ${info.section}${info.row ? `, Row ${info.row}` : ''}${info.seat ? `, Seat ${info.seat}` : ''}**\n\n` +
          `Here's how to get there:\n` +
          `1. Enter through **Gate ${info.section < 200 ? 'A or B' : info.section < 300 ? 'B or C' : 'C or D'}** (shortest route to your section)\n` +
          `2. Take the **main concourse** — Section ${info.section} is clearly signed in **${info.section < 200 ? 'blue' : info.section < 300 ? 'green' : 'orange'}**\n` +
          `3. Use **Elevator 3** if you need step-free access\n` +
          `4. Look for **Row ${info.row || 'signs'}** — they're marked at aisle ends\n\n` +
          `💡 *Tip: Tap the Navigate tab to see this route drawn on the live map!*`;
      }
      return `📍 **Finding Your Seat**\n\nTo find your seat:\n1. Check your ticket for Section, Row, and Seat number\n2. Enter through the nearest gate to your section number\n3. Follow the color-coded signage on each concourse level\n4. Staff in red vests are stationed at every section entrance\n\n*Open the Navigate tab and enter your seat details for a personalized route map!*`;
    },

    [INTENTS.NAVIGATION]: (text) => {
      const facility = extractFacility(text);
      const facilityResponses = {
        restroom: `🚻 **Nearest Restrooms**\n\nRestrooms are located **every 5 sections** on every concourse level:\n• Lower Concourse (100s): Between Sections 105, 110, 115, 120, 125...\n• Upper Concourse (300s): Between Sections 305, 310, 315...\n\n**Accessible restrooms** (extra space): At every gate entrance\n**Family restrooms**: Section 115 (changing tables + space for prams)\n\n💡 *Tip: Open Navigate tab and tap "Nearest Toilet" for a drawn route!*`,
        food: `🍔 **Nearest Food Concessions**\n\nConcession stands are at:\n• **Main Concourse**: Stands at every 3 sections\n• **International Food Zone**: Section 130 area (cuisine from all 48 nations!)\n• **Halal Station**: Gate B concourse\n• **Vegan/Veggie Green Bar**: Section 130 green concession\n• **Club Level Dining**: Sections 200-249 (sit-down)\n\nOpen the Navigate tab → "Food" to find the closest stand!`,
        medical: `🏥 **First Aid Stations**\n\nFirst Aid stations are located at:\n• **Section 110** (lower bowl, north end)\n• **Section 330** (upper bowl, south end)\n• **Gate A** lobby (external)\n• **Gate C** lobby (external)\n\nIn any medical emergency — **call the SOS button** in the Emergency tab or call **+1-800-WC26-MED**. Do not move an injured person. Staff in green vests will respond.`,
        gate: `🚪 **Stadium Gates**\n\nThere are 4 main gates:\n• **Gate A** (North) — Sections 101-125, Family Zone\n• **Gate B** (East) — Sections 125-175, VIP\n• **Gate C** (South) — Sections 175-225, Media\n• **Gate D** (West) — Sections 225-149, Accessible\n\nGates open **3 hours before kickoff**. Your ticket shows your designated gate.`,
        atm: `💳 **ATMs**\n\nATMs are located at:\n• Gate A lobby (2 machines)\n• Gate C lobby (2 machines)\n• Club Level entrance (1 machine)\n\nNote: **Cashless payment preferred** — most concessions accept card, Apple Pay, Google Pay.`,
        elevator: `🛗 **Elevators**\n\nElevators (lifts) at each gate:\n• **Gate A**: 2 elevators — Level 1 to 3\n• **Gate B**: 2 elevators — Level 1 to 3\n• **Gate C**: 2 elevators — Level 1 to 3\n• **Gate D**: 2 elevators — Level 1 to 3\n\nPriority access for wheelchair users. Press the assist button for staff help.`,
        parking: `🚗 **Parking**\n\n• **Lots A–F**: Opens 4 hours before kickoff — **cashless only**\n• **Accessible Parking**: Lot A1 (nearest gate, permit required)\n• **Cost**: $45-75 depending on lot\n\n⚠️ *Roads close 4hrs before/2hrs after. Public transit strongly recommended!*\n• Metro to stadium: **NJ Transit Meadowlands Rail** from Penn Station (20 min)`
      };
      if (facility && facilityResponses[facility]) return facilityResponses[facility];
      return `🗺️ **Stadium Navigation**\n\nI can help you find:\n• 📍 Your seat (Section/Row/Seat)\n• 🚻 Nearest restrooms\n• 🍔 Food concessions\n• 🏥 First Aid stations\n• 🚪 Gates and exits\n• 🛗 Elevators\n• 💳 ATMs\n\nJust tell me where you want to go, or open the **Navigate tab** for the interactive stadium map with AI turn-by-turn directions!`;
    },

    [INTENTS.FOOD]: (text) => {
      const lc = text.toLowerCase();
      if (/halal/.test(lc)) {
        return `🌙 **Halal Food Options**\n\nHalal certified stations at:\n• **Halal Station** — Gate B concourse\n  - Falafel Wrap ($12)\n  - Chicken Tikka Naan ($14)\n  - Halal Hot Dog ($9)\n  - Fresh Juices ($6)\n\n• **International Food Zone** (Section 130) — multiple halal options from Middle Eastern, South Asian, and African cuisine\n\nAll halal items are clearly marked with the ☪️ symbol. Certified by FIFA's halal food partner.`;
      }
      if (/vegan|vegetarian|veggie/.test(lc)) {
        return `🥗 **Vegan & Vegetarian Options**\n\n• **Green Concession Bar** (Section 130):\n  - Vegan Burrito Bowl ($13)\n  - Veggie Burger ($11)\n  - Fresh Fruit Cup ($7)\n  - Vegan Nachos ($10)\n  - Plant-based hot dog ($9)\n\n• **International Food Zone**: Many plant-based options from world cuisines\n\nAll vegan items are marked with 🌱. Ask staff if unsure — they're trained on allergen info.`;
      }
      if (/beer|alcohol|drink/.test(lc)) {
        return `🍺 **Beverages & Alcohol**\n\n• **Beer**: Budweiser, Corona, Michelob Ultra — $14 each\n• **Non-alcoholic beer**: Available at all stands — $8\n• **Soft drinks**: Coke, Pepsi, Sprite, water — $6\n• **Juice / smoothies**: Green concession bar — $7-9\n\n⚠️ **Age requirement**: 21+ USA, 18+ Canada & Mexico. Valid ID required.\n⚠️ Alcohol service stops at the 75th minute of each match.`;
      }
      return `🍔 **Food & Drink at the Stadium**\n\nWe have 12+ food stations:\n\n🥤 **Drinks**: Coke, Pepsi, Sprite, Water ($6), Beer ($14)\n🌭 **Classic**: Hot Dog ($9), Nachos ($11), Pizza ($8)\n🌮 **International**: Tacos ($13), Empanadas ($10), Poutine ($12 CAD)\n🌙 **Halal**: Falafel Wrap ($12), Chicken Tikka ($14) — Gate B\n🌱 **Vegan/Veggie**: Burrito Bowl ($13), Veggie Burger ($11) — Section 130\n\nOpen the **Fan Experience → Menus** tab for the full menu. Cards, Apple Pay, Google Pay accepted everywhere!`;
    },

    [INTENTS.RULES]: (text) => {
      const lc = text.toLowerCase();
      if (/offside/.test(lc)) {
        return `⚽ **The Offside Rule**\n\nA player is in an **offside position** if:\n• Any part of their head, body, or feet is closer to the opponents' goal line than **both the ball AND the second-to-last opponent** at the moment the ball is played\n\n**Not offside**: Arms are excluded. Being level with the last defender = onside.\n\n**VAR** (Video Assistant Referee) checks offside decisions using semi-automated offside technology with sub-centimetre precision at FIFA WC 2026.`;
      }
      if (/var/.test(lc)) {
        return `📺 **VAR — Video Assistant Referee**\n\nVAR can intervene in 4 situations:\n1. **Goal/No Goal** — offside, foul in the build-up\n2. **Penalty/No Penalty** — foul assessment in the area\n3. **Direct Red Card** — serious foul play, violent conduct\n4. **Mistaken Identity** — wrong player cautioned/dismissed\n\nFIFA WC 2026 uses **Semi-Automated Offside Technology (SAOT)** for instant, sub-centimetre offside checks shown on stadium screens.`;
      }
      if (/card|yellow|red/.test(lc)) {
        return `🟨🟥 **Cards & Disciplinary Rules**\n\n**Yellow Card** = Caution\n• Two yellows in one match = automatic red card\n• Accumulate 2 yellows across group stage = 1-match ban\n\n**Red Card** = Immediate ejection\n• Player must leave the pitch immediately\n• Team plays with 10 players for remainder of match\n• Player suspended for next match (serious foul = longer ban)\n\n**Referee's discretion** applies in all cases.`;
      }
      const randomRule = Utils.randItem(KB.rules.game);
      return `📋 **FIFA Rules & Regulations**\n\nHere's what you need to know:\n\n${KB.rules.game.slice(0, 4).map(r => `• ${r}`).join('\n')}\n\n*Ask me about specific rules: offside, VAR, cards, substitutions, penalties, etc.!*`;
    },

    [INTENTS.SCHEDULE]: (text) => {
      const upcoming = KB.matches.filter(m => m.status === 'upcoming').slice(0, 3);
      const completed = KB.matches.filter(m => m.status === 'completed').slice(-2);
      let response = `📅 **FIFA World Cup 2026 — Match Schedule**\n\n`;

      if (completed.length) {
        response += `**Recent Results:**\n`;
        completed.forEach(m => {
          response += `• ${m.home.flag} ${m.home.team} **${m.score.home}–${m.score.away}** ${m.away.team} ${m.away.flag} *(${m.stage})*\n`;
        });
        response += '\n';
      }

      response += `**Upcoming Matches:**\n`;
      upcoming.forEach(m => {
        response += `• ${Utils.formatDate(m.date)} ${Utils.formatTime(m.time)} — ${m.home.flag} **${m.home.team}** vs **${m.away.team}** ${m.away.flag} *(${m.stage} · ${m.city})*\n`;
      });

      response += `\n🏆 **The FINAL** is on **19 July 2026** at **MetLife Stadium, New York**\n\n*Open the Tickets tab for the full schedule and live standings!*`;
      return response;
    },

    [INTENTS.TRANSPORT]: () => {
      return `🚌 **Getting to the Stadium**\n\n**🚇 Public Transport (Recommended):**\n• NJ Transit Meadowlands Rail — Direct from Penn Station, 20 min\n• Express buses from NY Port Authority Bus Terminal\n• Metro: Increased frequency on match days\n\n**🚗 Parking:**\n• Lots A–F open 4hrs before kickoff — cashless only\n• $45-75 per vehicle\n• Accessible: Lot A1 (permit required)\n• Roads close 4hrs before/2hrs after match\n\n**🚕 Rideshare:**\n• Uber/Lyft: Designated pickup at Lot B1 East\n• Pre-book in the app before arriving\n\n**🚶 Walking:**\n• From Meadowlands Station: 8-minute walk (signposted)\n\n💡 *Leave 2+ hours before kickoff on match days!*`;
    },

    [INTENTS.EMERGENCY]: () => {
      return `🚨 **EMERGENCY ASSISTANCE**\n\nFor immediate emergencies:\n\n• **🔴 Tap the SOS button** in the Emergency tab — sends your GPS location instantly\n• **Call Security**: +1-800-WC26-SEC\n• **Call Medical**: +1-800-WC26-MED\n• **Fire/Police**: 911 (USA) or 112 (Canada/Mexico)\n\n**In case of evacuation:**\nFollow green emergency lighting to the nearest exit. Do NOT use elevators. Leave all belongings. Follow staff instructions.\n\n*Go to the Emergency tab now for full safety resources.*`;
    },

    [INTENTS.MEDICAL]: () => {
      return `🏥 **Medical Assistance**\n\n**First Aid Stations:**\n• Section 110 (lower bowl)\n• Section 330 (upper bowl)\n• Gate A lobby (external)\n• Gate C lobby (external)\n\n**For emergencies:** Tap SOS in the Emergency tab OR call **+1-800-WC26-MED**\n\nMedical staff wear **green vests** and are stationed throughout the venue. AED defibrillators are located at all First Aid stations and every gate entrance.\n\n⚠️ Do not move a seriously injured person. Call for help and keep the area clear.`;
    },

    [INTENTS.ACCESSIBILITY]: () => {
      return `♿ **Accessibility Services**\n\n• **Accessible Seating**: Sections 120, 140 (lower), 320 (upper)\n• **Wheelchair Parking**: Lot A1 — permit required\n• **Elevators**: At all 4 gates — priority for wheelchair users\n• **Hearing Loops**: Installed throughout — compatible with T-coil hearing aids\n• **Guide Dogs**: Welcome throughout the venue\n• **Accessible Restrooms**: At every gate and family zones\n• **Personal Assistance**: Request via the app — staff will meet you at your gate\n• **Accessible Transport**: Access-A-Ride and equivalent services stop at Gate D\n\n📞 **Accessibility Hotline**: +1-800-FIFA-ACC\n📧 accessibility@fifa.wc2026.com`;
    },

    [INTENTS.WIFI]: () => {
      return `📶 **Free Stadium WiFi**\n\n• **Network name**: FIFA_WC2026_FAN\n• **Password**: No password required — open network\n• **Speed**: Gigabit capacity supporting 80,000+ connections\n• **Coverage**: 100% of all seating areas, concourses, and fan zones\n\n💡 **Tips:**\n• The network auto-connects on most devices\n• For best speeds, avoid streaming large videos during peak times\n• This SmartStadium app works fully **offline** too!\n• VPN connections are supported`;
    },

    [INTENTS.LOST]: (text) => {
      if (/child|kid|son|daughter|boy|girl/.test(text.toLowerCase())) {
        return `🧒 **Missing Child — URGENT**\n\n1. **Go to the Emergency tab immediately** → tap "Report Missing Child"\n2. Call the dedicated Child Safety line: **+1-800-WC26-KID**\n3. Go to the nearest Information Desk (every gate) — staff will coordinate a search immediately\n4. Notify nearby security staff (blue/yellow vests)\n\n**Stay calm** — our team responds to missing child reports as top priority. All staff will be alerted within 60 seconds of a report being filed.`;
      }
      return `🔍 **Lost & Found**\n\n**If you've lost something:**\n1. Go to the Emergency tab → "Lost & Found"\n2. Submit a report — you'll receive a tracking reference number\n3. Visit the **Information Desk at Gate A** (open all day)\n4. Call: **+1-800-WC26-LST**\n\n**If you've found something:**\nBring it to any Information Desk or Security post immediately.\n\n**Common items found**: Phones (kept at Gate A desk), Wallets (secured with Security), Clothing, Bags\n\n*All found items are logged and held for 60 days after the tournament.*`;
    },

    [INTENTS.WEATHER]: () => {
      const weathers = [
        { desc: 'Partly Cloudy', temp: '78°F / 26°C', icon: '⛅', tips: ['Bring sunscreen!', 'Light layers recommended for evening'] },
        { desc: 'Sunny', temp: '84°F / 29°C', icon: '☀️', tips: ['Hat and sunscreen essential', 'Stay hydrated — free water refill stations inside'] },
        { desc: 'Clear Evening', temp: '68°F / 20°C', icon: '🌙', tips: ['Perfect match weather!', 'Light jacket for post-match'] }
      ];
      const w = Utils.randItem(weathers);
      return `🌤️ **Match Day Weather — MetLife Stadium**\n\n${w.icon} **${w.desc}** — ${w.temp}\n\n**What to bring:**\n${w.tips.map(t => `• ${t}`).join('\n')}\n\n• Sealed water bottles (500ml) are permitted inside\n• Stadium concessions sell cold drinks and hot beverages\n• Umbrella max size: 12" — larger umbrellas prohibited\n\n*Check the Home tab weather widget for real-time conditions!*`;
    },

    [INTENTS.TICKETS]: () => {
      return `🎟️ **Tickets & Entry**\n\n**Mobile Tickets:**\n• Open the Tickets tab → show your QR code at the gate\n• Ensure screen brightness is high for scanning\n• No print required — fully digital\n\n**Entry Rules:**\n• Gates open **3 hours before kickoff**\n• Ticket is linked to your ID — bring valid photo ID\n• No re-entry once you leave the venue\n• Late arrivals: your seat may be used until 15 mins after kickoff\n\n**Resale / Transfer:**\n• Tickets are non-transferable\n• Official resale only via FIFA's authorised platform\n\n**Wallet:** Your ticket is saved in the Tickets tab — it works offline too!`;
    },

    [INTENTS.FANZONE]: () => {
      const activities = KB.fanZoneActivities.slice(0, 4);
      let response = `🎉 **Fan Zone Activities — Top Picks!**\n\n`;
      activities.forEach(a => {
        response += `**${a.emoji} ${a.name}**\n📍 ${a.location} · ⏱ ${a.duration} · 💰 ${a.cost}\n${a.description}\n\n`;
      });
      response += `*See all 8+ activities in the **Fan Experience tab** with personalised recommendations!*`;
      return response;
    },

    [INTENTS.PLAYERS]: (text) => {
      const lc = text.toLowerCase();
      const playerMap = {
        mbappe: 'mbappe', mbappé: 'mbappe', kylian: 'mbappe',
        yamal: 'yamal', lamine: 'yamal',
        haaland: 'haaland', erling: 'haaland',
        vini: 'vini', vinicius: 'vini',
        bellingham: 'bellingham', jude: 'bellingham',
        ronaldo: 'ronaldo', cr7: 'ronaldo', cristiano: 'ronaldo',
        messi: 'messi', leo: 'messi', lionel: 'messi'
      };

      const found = Object.keys(playerMap).find(k => lc.includes(k));
      if (found) {
        const p = KB.players.find(pl => pl.id === playerMap[found]);
        if (p) {
          return `⭐ **${p.name}** ${p.flag}\n\n📊 **Stats:** ${p.goals} international goals · ${p.caps} caps · Age ${p.age}\n🏟️ **Club:** ${p.club}\n⚽ **Position:** ${p.position}\n\n📖 **${p.bio}**\n\n🏷️ **Known for:** ${p.tags.join(' · ')}\n\n*This is one of ${KB.players.length} legendary players featured in the SmartStadium app hero carousel!*`;
        }
      }
      return `⭐ **FIFA WC 2026 — Stars to Watch**\n\n${KB.players.slice(0, 5).map(p => `${p.flag} **${p.name}** (${p.country}) — ${p.goals} goals in ${p.caps} caps`).join('\n')}\n\n...and many more! Check the home carousel for player profiles. Who's your favourite? 😄`;
    },

    [INTENTS.GENERAL]: (text) => {
      const responses = [
        `I can help with:\n• 📍 **Navigation** — finding your seat, gates, facilities\n• 🍔 **Food & Drink** — menus, halal, vegan options\n• 📅 **Match Schedule** — fixtures, results, standings\n• 📋 **Rules** — offside, VAR, cards, substitutions\n• 🚌 **Transport** — metro, parking, rideshare\n• 🆘 **Safety** — SOS, First Aid, Lost & Found\n• 🎉 **Fan Zone** — activities, merchandise, experiences\n\nWhat would you like to know?`,
        `Great question! As your FIFA World Cup 2026 assistant, I have information about everything at the stadium. Try asking about your seat location, nearby food, the match schedule, or stadium rules!`,
        `I'm your AI companion for the greatest show on Earth! I can answer questions about the stadium layout, match day info, FIFA rules, food options, transport, and safety. What's on your mind?`
      ];
      return Utils.randItem(responses);
    }
  };

  /* =========================================================================
   * INTENT CLASSIFIER
   * ========================================================================= */

  /**
   * Classify the intent of user input
   * @param {string} text - Sanitized user input
   * @returns {string} Intent constant
   */
  function classifyIntent(text) {
    for (const { intent, patterns } of PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(text)) return intent;
      }
    }
    return INTENTS.GENERAL;
  }

  /* =========================================================================
   * PUBLIC: Generate Response
   * ========================================================================= */

  /**
   * Generate a contextual AI response to user input
   * Attempts real Gemini API first, falls back to demo mode
   * @param {string} rawInput - Raw user text (will be sanitized internally)
   * @param {Object} [context] - Optional context: { currentSection, language, matchId }
   * @returns {Promise<string>} Response text (may contain markdown)
   */
  async function respond(rawInput, context = {}) {
    // Security: sanitize input before any processing
    if (!Utils.isSafeInput(rawInput)) {
      return '⚠️ Please enter a valid question without special characters.';
    }
    const input = rawInput.trim().slice(0, 500);
    if (!input) return '';

    // Attempt real Gemini API if key is provided
    const apiKey = Utils.getStorage('ss_gemini_key', null);
    if (apiKey) {
      try {
        return await callGeminiAPI(input, apiKey, context);
      } catch (err) {
        console.warn('[AIEngine] Gemini API failed, falling back to demo mode:', err.message);
      }
    }

    // Demo mode: classify and respond
    return demoRespond(input, context);
  }

  /**
   * Demo mode response generator
   * @param {string} input - Sanitized input
   * @param {Object} context
   * @returns {string}
   */
  function demoRespond(input, context) {
    const intent = classifyIntent(input);
    console.debug(`[AIEngine] Intent: ${intent} for: "${input.slice(0, 60)}"`);

    const generator = RESPONSES[intent] || RESPONSES[INTENTS.GENERAL];
    try {
      return generator(input, context);
    } catch (err) {
      console.error('[AIEngine] Response generation error:', err);
      return RESPONSES[INTENTS.GENERAL](input, context);
    }
  }

  /**
   * Call Gemini API with stadium context
   * @param {string} input
   * @param {string} apiKey
   * @param {Object} context
   * @returns {Promise<string>}
   */
  async function callGeminiAPI(input, apiKey, context) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemContext = `You are SmartAI, the official AI assistant for FIFA World Cup 2026 stadiums. 
    You are currently assisting a fan at ${context.stadium || 'MetLife Stadium, New York'}.
    Current language: ${I18n.getLang()}. Keep responses concise, helpful, and friendly.
    Focus on: navigation, food, seating, FIFA rules, transport, safety, and fan experiences.
    Use markdown formatting for better readability. Always end with a helpful tip or follow-up suggestion.`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemContext}\n\nFan question: ${input}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || demoRespond(input, context);
  }

  /* =========================================================================
   * VOICE I/O
   * ========================================================================= */

  let recognition = null;
  let isListening = false;
  let synthesis = window.speechSynthesis;

  /**
   * Start voice recognition
   * @param {Function} onResult - Callback with transcript string
   * @param {Function} onError - Callback with error message
   * @param {Function} onEnd - Callback when recognition ends
   * @returns {boolean} Success
   */
  function startListening(onResult, onError, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError?.('Voice input not supported in this browser. Try Chrome.');
      return false;
    }

    if (isListening) stopListening();

    recognition = new SpeechRecognition();
    recognition.lang = I18n.getSpeechLang();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onResult?.(transcript);
        Utils.announce(`You said: ${transcript}`, 'polite');
      }
    };

    recognition.onerror = (e) => {
      const messages = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'Microphone not accessible. Check browser permissions.',
        'not-allowed': 'Microphone access denied. Please allow microphone in browser settings.',
        'network': 'Network error during voice recognition.'
      };
      onError?.(messages[e.error] || `Voice error: ${e.error}`);
      isListening = false;
    };

    recognition.onend = () => {
      isListening = false;
      onEnd?.();
    };

    try {
      recognition.start();
      isListening = true;
      Utils.announce('Listening. Speak now.', 'assertive');
      return true;
    } catch (err) {
      console.error('[AIEngine] Voice start error:', err);
      onError?.('Could not start voice recognition.');
      return false;
    }
  }

  /**
   * Stop voice recognition
   */
  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  }

  /**
   * Speak text using TTS
   * @param {string} text - Text to speak (markdown stripped)
   * @param {Function} [onEnd] - Callback when speech ends
   */
  function speak(text, onEnd) {
    if (!synthesis) return;
    synthesis.cancel(); // Cancel any ongoing speech

    // Strip markdown for cleaner TTS
    const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').replace(/•/g, '').slice(0, 800);

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = I18n.getSpeechLang();
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Try to find a voice matching the language
    const voices = synthesis.getVoices();
    const langCode = I18n.getLang();
    const matchedVoice = voices.find(v => v.lang.startsWith(langCode) && !v.name.includes('Google'));
    if (matchedVoice) utter.voice = matchedVoice;

    utter.onend = () => onEnd?.();
    utter.onerror = (e) => console.warn('[AIEngine] TTS error:', e.error);

    synthesis.speak(utter);
  }

  /**
   * Stop speech synthesis
   */
  function stopSpeaking() {
    synthesis?.cancel();
  }

  /**
   * Check if voice input is supported
   * @returns {boolean}
   */
  function isVoiceSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Check if TTS is supported
   * @returns {boolean}
   */
  function isTTSSupported() {
    return !!window.speechSynthesis;
  }

  return {
    respond,
    classifyIntent,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isVoiceSupported,
    isTTSSupported,
    isListening: () => isListening,
    INTENTS
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AIEngine;
