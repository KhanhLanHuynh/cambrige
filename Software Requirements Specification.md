# **Software Requirements Specification (SRS)**

## **Project Name: Cambridge Vocab Quest**

**Target Level:** Cambridge English Qualifications (Flyers focus, with Starters & Movers spaced review)

**Primary Audience:** Learners aged 9–12 (Primary / Upper Primary)

**Secondary Audience:** Parents and Educators (Teachers, Tutors)

## **1\. System Overview & Objectives**

### **1.1 Purpose**

The purpose of **Cambridge Vocab Quest** is to deliver a gamified, high-engagement web application designed to expand young learners' vocabulary at the CEFR A2 (Flyers) level while continuously reinforcing A1 (Starters and Movers) vocabulary through adaptive spaced repetition.

### **1.2 Core Product Goals**

* **High Retention & Engagement:** Utilize non-punitive gamification (streaks, avatar cosmetics, daily quests, mastery stars) suited for 9–12 year olds.  
* **Pedagogical Alignment:** Map all vocabulary items to official Cambridge Starters, Movers, and Flyers word lists organized by thematic topics.  
* **Dual-Role Management:** Provide adults (parents/teachers) with actionable learning analytics, word-health diagnostic tools, and screen-time/curriculum controls.  
* **Privacy & Safety First:** Maintain strict data privacy standards (COPPA/GDPR-K compliance) with zero public social features or personally identifiable information (PII) required for child profiles.

## **2\. User Roles & Authentication Architecture**

### **2.1 Role Hierarchy**

┌─────────────────────────────────────────────────────────────┐  
│                    PARENT / TEACHER (Admin)                 │  
│  \- Email/Password or OAuth Authentication                   │  
│  \- Account Billing, Settings, Profile Creation              │  
│  \- Diagnostic Dashboard & Custom Curriculum Assignment      │  
└──────────────────────────────┬──────────────────────────────┘  
                               │  
               ┌───────────────┴───────────────┐  
               ▼                               ▼  
   ┌──────────────────────┐        ┌──────────────────────┐  
   │    LEARNER PROFILE 1 │        │    LEARNER PROFILE 2 │  
   │  \- Display Handle    │        │  \- Display Handle    │  
   │  \- Picture / Icon PIN│        │  \- Picture / Icon PIN│  
   │  \- Gamified Hub      │        │  \- Gamified Hub      │  
   └──────────────────────┘        └──────────────────────┘

### **2.2 Functional Specifications for User Management**

| Role | Auth Method | Capabilities & Permissions |
| :---- | :---- | :---- |
| **Learner (Child)** | Account Switcher \+ 4-Icon Visual PIN or 4-Digit Passcode | • Full access to learning maps, daily quests, and game modes. • Ability to spend earned "Vocab Gems" in the Reward Shop. • View personal streak, badges, and unlockable card collection. • *No access to billing, global settings, or raw analytics.* |
| **Parent / Teacher** | Email \+ Password / Google OAuth | • Create, edit, and delete linked Learner Profiles. • Set/reset Learner PINs. • View detailed diagnostic reports (Word Health Matrix, time spent, accuracy). • Configure curriculum priorities, spaced repetition mix, and screen-time limits. |

### **2.3 Parental Gate Specification**

To prevent children from exiting the game environment into account management or subscription pages, any interaction outside the Learner UI requires solving a dynamic multiplication puzzle or entering the Parent Master Password.

## **3\. Learning & Gameplay Engine Specification**

### **3.1 Content Model & Vocabulary Distribution**

Each activity or exercise dynamically pulls words from a structured vocabulary pool based on the following algorithmically controlled ratio:

* **70% Focus Level (Flyers):** Target CEFR A2 vocabulary (*e.g., environment, astronaut, century, factory, brave*).  
* **20% Spaced Review (Movers):** Target CEFR A1+ vocabulary (*e.g., waterfall, stomach-ache, market, skate*).  
* **10% Warm-up / Bonus (Starters):** Target CEFR A1 vocabulary (*e.g., crocodile, hippo, eraser, kitchen*).

### **3.2 Thematic Topic Clusters**

Vocabulary items are grouped into 10–12 theme packs rather than alphabetical lists:

1. 🚀 *Space, Science & Discovery*  
2. 🌿 *Nature, Animals & Eco-World*  
3. 💼 *Professions & Future Jobs*  
4. 🎭 *Emotions, Health & Personality*  
5. 🏰 *History, Castles & Legends*  
6. 🏙️ *Cities, Places & Architecture*  
7. 🎨 *Arts, Media & Hobbies*  
8. ✈️ *Travel, Weather & Adventure*

### **3.3 Game Modes & Mechanics**

#### **Mode A: Word Explorer (Learn Phase)**

* **Format:** Interactive card view.  
* **Assets Required per Word:**  
  * High-definition illustration/visual asset.  
  * Native speaker audio pronunciation file (.mp3 / WebAudio).  
  * Contextual example sentence with highlight (*e.g., "The **astronaut** floated in space."*).  
  * Tap-to-reveal translation or kid-friendly definition hint.

#### **Mode B: Speed Match (Arcade Practice)**

* **Format:** 45-second interactive matching game.  
* **Mechanic:** Connect vocabulary text cards to corresponding target illustrations or audio clips.  
* **Scoring:** Correct matches add points and time bonuses (+2 sec); incorrect attempts wobble without deducting points.

#### **Mode C: Spelling Quest (Writing Practice)**

* **Format:** Scrambled letter bubbles or direct keyboard input based on audio prompts and visual hints.  
* **Scoring:** On-screen hint button available after one unsuccessful attempt; highlights correct letter placements.

#### **Mode D: Boss Battles (Topic Mastery Challenge)**

* **Format:** Multi-stage quiz at the end of a thematic unit.  
* **Mechanic:** Answering Flyers questions attacks the boss; correct bonus Movers/Starters questions trigger "Critical Hits" for extra gem rewards.

## **4\. Gamification & Engagement Architecture**

### **4.1 Path of Mastery (Node Navigation)**

* Progress is visually represented as an interactive island/space route.  
* Each node offers a 3-Star Mastery rating:  
  * ⭐ **1 Star:** Lesson completed.  
  * ⭐⭐ **2 Stars:** Scored ![][image1] accuracy without time extensions.  
  * ⭐⭐⭐ **3 Stars:** ![][image2] accuracy or completed in "Speed Mode."

### **4.2 Streak System & Streak Shield**

* **Daily Streak Counter:** Increments when at least 1 daily activity is completed.  
* **Streak Shield:** Learners can purchase up to 2 "Streak Freeze" items in the reward shop using in-game Vocab Gems, protecting streaks during inactive days.

### **4.3 Daily Quest Engine**

Resets every 24 hours UTC. Displays 3 progressive tasks:

1. *Quest 1 (Easy):* Complete 1 Flyers lesson (+30 Gems).  
2. *Quest 2 (Medium):* Review 5 Movers/Starters words (+50 Gems).  
3. *Quest 3 (Hard):* Maintain a 5-answer accuracy streak (+70 Gems).

### **4.4 Reward Economy & Customization**

* **Currency:** Vocab Gems (non-purchasable, earned solely through correct answers and quest completions).  
* **Shop Items:**  
  * Avatar Frames (Neon, Cosmic, Gold).  
  * Mascot Outfits (Astronaut, Wizard, Detective).  
  * Profile Titles (*Word Explorer*, *Flyers Ace*, *Vocab Legend*).  
  * Collectible Concept Cards featuring word artwork and trivia.

## **5\. Parent & Educator Dashboard Specifications**

### **5.1 High-Level Metrics Display**

* **Practice Volume:** Total minutes practiced today / this week.  
* **Mastery Gauges:** Percentage bars showing word mastery for Starters, Movers, and Flyers tiers.  
* **Accuracy Rate:** Total accuracy percentage over the last 30 days.

### **5.2 Diagnostic "Word Health" Matrix**

System automatically categorizes all encountered words into three statuses:

┌─────────────────────────────────────────────────────────────────┐  
│                        WORD HEALTH MATRIX                       │  
├─────────────────────────────────────────────────────────────────┤  
│ 🟢 MASTERED     │ Correct 3+ consecutive times across modes     │  
│ 🟡 LEARNING     │ Introduced recently; 1-2 correct responses      │  
│ 🔴 STRUGGLING   │ Answered incorrectly 2+ times in recent sessions│  
└─────────────────────────────────────────────────────────────────┘

* **Action Tools:** Adults can click *"Export Struggling Words to Flashcard PDF"* or *"Inject Struggling Words into Tomorrow's Daily Quest."*

### **5.3 Curriculum & Session Controls**

* **Priority Topic Pinning:** Force a specific theme (e.g., *Space & Science*) to appear first on the child's home screen.  
* **Spaced Repetition Ratio Selector:** Adjust review frequency (10%, 25%, or 40% review mix).  
* **Daily Time Limit:** Optional auto-lock timer (15, 30, 45, or 60 minutes).  
* **Game Mode Toggles:** Option to disable timed arcade modes for children sensitive to timers.

## **6\. Non-Functional & Technical Requirements**

### **6.1 Usability & Accessibility (9–12 Age Bracket)**

* **UI Aesthetic:** Dark slate background with vibrant neon accents (green \#22c55e, blue \#38bdf8, orange \#ff7d29, yellow \#facc15).  
* **Font Standards:** High-legibility sans-serif typeface (*Plus Jakarta Sans* or *Lexend*).  
* **Feedback Animations:** Immediate visual feedback (confetti particle effects, tactile 3D button presses, soft audio cues).  
* **Gentle Failure UX:** No loud error alarms or harsh red failure screens; incorrect choices trigger a subtle card shake and immediate retry option.

### **6.2 Security, Privacy & Compliance**

* **Data Minimization:** No child PII (email, full name, age, phone number) collected.  
* **Compliance Standards:** Aligned with COPPA (Children's Online Privacy Protection Act) and GDPR-K.  
* **Storage:** Child data limited to display handle, avatar preferences, session logs, and word mastery scores.

### **6.3 Performance & Offline Capabilities**

* Asset lazy-loading for image and audio resources to ensure quick load times on mobile devices and tablet connections.  
* Offline support via Web Storage (localStorage / IndexedDB) to sync progress when reconnecting to the internet.

## **7\. Data Model Specifications (JSON Schemas)**

### **7.1 Learner Profile State Schema**

{  
  "profileId": "child\_882931",  
  "parentId": "parent\_102938",  
  "handle": "StarVoyager99",  
  "avatar": {  
    "icon": "astronaut\_cat",  
    "frame": "neon\_blue",  
    "title": "Flyers Ace"  
  },  
  "stats": {  
    "streakDays": 7,  
    "streakShields": 1,  
    "totalGems": 420,  
    "totalTimeSpentMinutes": 185  
  },  
  "questState": {  
    "lastResetDate": "2026-07-25",  
    "quests": \[  
      { "id": "q1", "progress": 1, "target": 2, "claimed": false },  
      { "id": "q2", "progress": 5, "target": 5, "claimed": true }  
    \]  
  }  
}

### **7.2 Word Mastery Record Schema**

{  
  "profileId": "child\_882931",  
  "wordId": "flyers\_astronaut",  
  "cefrLevel": "Flyers",  
  "topic": "space\_discovery",  
  "healthStatus": "MASTERED",  
  "history": {  
    "timesSeen": 6,  
    "correctCount": 5,  
    "incorrectCount": 1,  
    "lastPracticed": "2026-07-25T10:30:00Z"  
  }  
}

## **8\. Summary & Next Steps**

This specification forms the foundation for building **Cambridge Vocab Quest**. Development can proceed incrementally by implementing the core vocabulary data models, creating the child UI interactive layout, and attaching the parent administrative dashboard features.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAZCAYAAACPQVaOAAADz0lEQVR4Xu2XW4iNURTHv9OMkPtlDHM53zkzwzQvTE1Sk3sU5ZZbMpPEmxFlQk2SQrlEcmnQlLwgkzJJudUoL1OEB7fiSeRBPIgXJX5/397s2XPmnDNnQur8a7X3Xnvty3/ttde3vyDII49/ikQiMbK0tHQM1ZjfZ1FXVzeguLh4iK//nxALw7AZsh2UhyjPpCJUVlY2mP5T5eXlS/y+v4JkMlmtDSJn4/F4Y5pNrpWNbDXG7WdcHfpnlBVBRHwv8hZpwjbktMvoW0X7EWUrNoXu+B7AcA7ShdfWKBT8/lzAfCuY7zJljdnQFur3tUFrU1FRMQLdbREoKioain2tiGmsM8825F51dfUwtZlnOu3tmlf7pWxAtxq5qnXsuLQwHt6APEY2pjqFbAGhYha/4S2uUznJBvdYBTY75QDKUVanzSPPNYfa2J+nfVfOMGN00iesPYhhczCn8NXJGo89QHZVVVUN920ywWzoBQ6c6OlFrs3UR4moyLg2bHoq+s9289RbXLKmf5+1Z575zHEsyBS+GVDApHORe8hhkwmzgu4XY94hr9jILOkUstRvOSRqkA8+WeOoL8h+temfTf2ljRLqm+wclZWV43RVsg7fLKAwmcYinchJZIJvkAIxNr0D2+8S6ucSUTZtVp8MLKneyFq9Ig1dK7p2pIn6JXPKhTrRnMI3EwjngSy0mwXfEJ5Vfn8KKDL2W8LIe4Vc8JvsYukzkTWIcYenaLxyixQi6YSvPZCjlAvUdsZmDzdxsdjWLBOXktFmhS1lvTlVEf7GHOtkQH1hH8h2g8IWmytOaK9A7ihHUO5Clvtj0kKkRI6BDxN9/CTpBBj3hDtVblQ6ZX1LdRd/ZtreSPWmd9AtfM3nqwtpUNvMfdomtLRQ9jXe0Xd3KaoC3yYTGNuGHPf1CjH0H0UobpKYT8qSRVpcvYUXviI3BdtPuhbGRCF9IEyXW9QZRgmoE6kPciBpIQKhyaYuTPjpk1Yjz1PeRa5jP8jasOl56L6qdMcKfvgK1jkOWa1/IOk8XroBw0UYdGAwOcj1cjuQ99nAU+ZMOGp5fD36C4E5FdZtRF6jS1qbMHoOdik8f42M8DN8dUVcpXHAG0tWTqTeWlJSMta1+5MoiEefng9hdCX0KmpHd5MNj7dGzmelE/0yQ1ROqnUnE0z4Hgx6HkYhY9psH3YzwujR4dv9WeghIo8jKzmpSUHqDcTUJxsia2aqRKh5RKi3hw1ZeDT9F+VMymtpHxlaQFksjO5tWtGrJejHff7nUNiE0S9WNnJEpP058sgjjzzy6Ad+ACVmG6QxTUA3AAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAZCAYAAAB3oa15AAADQElEQVR4Xu1WS2tTQRS+gQiKis8YzOveJGpwIS1EEUTFhRVdKOILqf6C1pWiQnEhaKHpQkSRqLhxURRFUMSFWLTgpuhCENRFF6JEunIj7UYI9ftyzwnTyb1J48aF94PDzJzHzPlmzp25jhPhP4bneSvT6fQadGO2TVEulxclk8mltv5fI+a67jkQeIZ2FO2doCQzmcwS2G9ls9lDti0Uno+Ttl6Rz+dLXBRyF9LPRWwfWbhffEYZY9pzuVwZ+s9oC45P5grkB2QQvi5OJQPbcYw/oK3CJ27GtwCOmyEDkNeQOgjct30I2I5yYdh7E4nEMln4VaFQWKE+7FNHG33oyxjGGvOchbwtlUrLOUaSOzE+zzy4eWhPQXcC8pRkNC4UEngY7Q5ILYhAsVjMwjbFyVWHBVZh/B5yxtBdpI421TEG8gW7m+SY82M8QYISwxO5qf5ADD6VrkqHwCTrId+CCEgSs1zMUPP4xzQZJWTHI5Ft0M9oQugPmQTEflX9MU8f5rjudCodGx0I3AggoLs5zXp2/VL8acfLDs9ChiVmD/pTWh7oDyg5nPQ62B8tqHRstCMgiYYRaOg1UTve1vNqhK4K3WPIIPoP5TTi3PmuS0cRRkA+2IkFEDiI/pwdbxMQxPBN9LBc9CZj4iTg+KXD72A74q6h3c+xERuMMAK8o6Ef70QA7YEuCMwDSwY+T4yy4o03DnIb0V6CHLFjWhBGgDATDdOHJRqmNzCvdOQqnnTlxuPthTlu60cfinYEoB9uQ6Amjw8/5Gk7XglAhky9wiodJtwD318sSXFhOY0wv2ZQENoR4CKw1THpXtXBbzF0LyjsG99KY6x+jIHutxmrsEuHUMIGAa41wldax4FQApAxx/po+NOFSd5BLqsO9bnB9R++5q8HFj0N+Q59XlT6qzBpvtiCRunAv89UCqmaEpA3pppKpdaafk3IDtUgdcicyAwm/4gkt6gfTmEr9F/hfwFyzPUfrQqvRfUxrsg3nv+6M/lP6Peqj0JKp+K03jBxxNxTG/x2uf5DZ/t1D95IOMp9TI6/F7ZdEMNubyJJ+O42CSp4okxSfqdbgI1bDfsDzPES7fO/etgiRIgQIUIn/AGC2xZiMv43iQAAAABJRU5ErkJggg==>