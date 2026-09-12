/* TI 2026 tournament data for the rdy.gg Dota 2 hub prototype.
 * GENERATED FILE. Do not edit by hand.
 * Source: .claude/dota-work/ti2026-data.json
 * Builder: .claude/dota-work/build_ti2026.py
 * Shape:   .claude/dota-work/data-shape.md
 *
 * The payload is frozen at Grand Final game five, series 2-2, in
 * progress. It contains no champion, no game five result, no MVP and no
 * per-team prize money.
 */
window.TI2026 = {
  "asOf": "SEE GF5.frozenAt",
  "asOfNote": "The hub is a frozen live snapshot of Grand Final game five. Read the exact timestamp from window.GF5.frozenAt.",
  "compiledOn": "2026-09-10",
  "openDotaLeagueId": 19719,
  "event": {
    "name": "The International 2026",
    "shortName": "TI 2026",
    "alsoKnownAs": "TI15",
    "edition": 15,
    "tier": "T1",
    "rdyTournamentId": 117076,
    "dates": {
      "start": "2026-08-13",
      "end": "2026-08-23",
      "groupStage": "2026-08-13 to 2026-08-16",
      "eliminationRound": "2026-08-16",
      "mainEvent": "2026-08-20 to 2026-08-23"
    },
    "city": "Shanghai",
    "country": "China",
    "venue": "Shanghai Oriental Sports Center",
    "venueNote": "Main Event / Playoffs 20 to 23 Aug at the Oriental Sports Center. Group Stage 13 to 16 Aug.",
    "timezone": "Asia/Shanghai (UTC+8)",
    "organiser": "Valve",
    "producer": "PGL",
    "teamsCount": 16,
    "prizePoolDisplay": "more than $3.3 million",
    "prizePoolNote": "No outlet agrees on an exact total. Five published figures span 3,333,614 to 3,442,957 USD, so the prototype prints a range-safe string and never a per-team figure.",
    "prizePoolBase": 1600000,
    "prizePoolFunding": "No Battle Pass. Base 1,600,000 from Valve plus 30% of supporter-bundle revenue (team bundles and talent sticker capsules); 50% of that revenue went to the teams and 20% to Valve. The sales window closed on grand final day, 23 Aug. Largest TI pool since the Battle Pass was dropped.",
    "format": {
      "phases": [
        {
          "name": "Group Stage",
          "dates": "2026-08-13 to 2026-08-16",
          "type": "Swiss system",
          "teams": 16,
          "rounds": 5,
          "seriesLength": "Bo3",
          "advancement": "Top 3 advance directly to the Main Event. 4th to 13th drop to the Elimination Round. Bottom 3 eliminated."
        },
        {
          "name": "Elimination Round",
          "dates": "2026-08-16",
          "type": "Single elimination play-in",
          "teams": 10,
          "rounds": null,
          "seriesLength": "Bo3",
          "advancement": "5 winners advance to the Main Event, 5 eliminated."
        },
        {
          "name": "Main Event (Playoffs)",
          "dates": "2026-08-20 to 2026-08-23",
          "type": "Double elimination",
          "teams": 8,
          "rounds": null,
          "seriesLength": "Bo3, grand final Bo5",
          "advancement": "No bracket reset in the grand final."
        }
      ],
      "directInvites": 7,
      "qualifierSlots": 9,
      "qualifierNote": "Western and Eastern Europe were merged into a single qualifier for the first time. Open qualifiers 9 to 12 June 2026, regional qualifiers 15 to 26 June 2026."
    },
    "viewership": {
      "peakViewers": 1796267,
      "peakMoment": "Tournament peak (Esports Charts tournament page)",
      "averageViewers": 590958,
      "hoursWatched": 64512840,
      "broadcastHours": 109,
      "source": "Esports Charts",
      "note": "Esports Charts figures. averageViewers, hoursWatched and broadcastHours are whole-event aggregates and are close to final at the frozen moment, not exact."
    },
    "broadcastBranding": "The Group Stage and Elimination Round were broadcast together as 'The Road to The International'."
  },
  "teams": [
    {
      "key": "spirit",
      "name": "Team Spirit",
      "displayName": "Team Spirit",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "TSpirit",
      "abbr": "TSP",
      "region": "Europe",
      "qualification": "Europe qualifier",
      "openDotaId": 7119388,
      "rdyTeamId": 50,
      "logo": "assets/teams/spirit.png",
      "logoNote": null,
      "colour": "#E23636",
      "groupStage": {
        "seed": 8,
        "rank": 8,
        "seriesRecord": "3-2",
        "gameRecord": "6-5",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "xtreme",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "aurora",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "liquid",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "vision",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "nigma",
            "score": "0-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "resilience",
        "score": "2-1",
        "result": "W",
        "advanced": true
      },
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "ironwing",
          "score": "2-0",
          "result": "W"
        },
        {
          "round": "Upper Bracket Semifinal",
          "shortRound": "UB Semifinal",
          "bracket": "upper",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "vision",
          "score": "1-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Quarterfinal",
          "shortRound": "LB Quarterfinal",
          "bracket": "lower",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "liquid",
          "score": "2-0",
          "result": "W"
        },
        {
          "round": "Lower Bracket Semifinal",
          "shortRound": "LB Semifinal",
          "bracket": "lower",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "boomboys",
          "score": "2-0",
          "result": "W"
        },
        {
          "round": "Lower Bracket Final",
          "shortRound": "LB Final",
          "bracket": "lower",
          "date": "2026-08-23",
          "seriesLength": "Bo3",
          "opponent": "yandex",
          "score": "2-0",
          "result": "W"
        },
        {
          "round": "Grand Final",
          "shortRound": "Grand Final",
          "bracket": "final",
          "date": "2026-08-23",
          "seriesLength": "Bo5",
          "opponent": "vision",
          "score": "2-2",
          "result": "live"
        }
      ],
      "placement": "grand final",
      "status": "In the grand final",
      "prize": null,
      "coach": {
        "handle": "Miposhka",
        "realName": "Yaroslav Naidenov"
      },
      "roster": [
        {
          "pos": 1,
          "handle": "Yatoro",
          "openDotaHandle": null,
          "realName": "Illya Mulyarchuk",
          "nationality": null,
          "rdyPlayerId": 5735,
          "photo": "assets/players/Spirit/Yatoro.webp",
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Larl",
          "openDotaHandle": null,
          "realName": "Denis Sigitov",
          "nationality": null,
          "rdyPlayerId": 5278,
          "photo": "assets/players/Spirit/Larl.webp",
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Collapse",
          "openDotaHandle": null,
          "realName": "Magomed Khalilov",
          "nationality": null,
          "rdyPlayerId": 5027,
          "photo": "assets/players/Spirit/Collapse.webp",
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "not_me",
          "openDotaHandle": null,
          "realName": "Alexey Kosmynin",
          "nationality": null,
          "rdyPlayerId": 23683,
          "photo": "assets/players/Spirit/not_me.webp",
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "rue",
          "openDotaHandle": null,
          "realName": "Alexandr Filin",
          "nationality": null,
          "rdyPlayerId": 14430,
          "photo": "assets/players/Spirit/rue.webp",
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "vision",
      "name": "TEAM VISION",
      "displayName": "TEAM VISION",
      "nameNote": "Plays as PARIVISION",
      "alsoKnownAs": "PARIVISION / PVISION",
      "tag": "VSN",
      "abbr": "VSN",
      "region": "Europe",
      "qualification": "Europe qualifier",
      "openDotaId": 9572001,
      "rdyTeamId": 342,
      "logo": "assets/teams/Parivision.webp",
      "logoNote": null,
      "colour": "#7B5CFF",
      "groupStage": {
        "seed": 1,
        "rank": 1,
        "seriesRecord": "4-0",
        "gameRecord": "8-2",
        "outcome": "main_event",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "resilience",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "falcons",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "boomboys",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "spirit",
            "score": "2-0",
            "result": "W"
          }
        ]
      },
      "eliminationRound": null,
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "boomboys",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Upper Bracket Semifinal",
          "shortRound": "UB Semifinal",
          "bracket": "upper",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "spirit",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Upper Bracket Final",
          "shortRound": "UB Final",
          "bracket": "upper",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "yandex",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Grand Final",
          "shortRound": "Grand Final",
          "bracket": "final",
          "date": "2026-08-23",
          "seriesLength": "Bo5",
          "opponent": "spirit",
          "score": "2-2",
          "result": "live"
        }
      ],
      "placement": "grand final",
      "status": "In the grand final",
      "prize": null,
      "coach": {
        "handle": "Puppey",
        "realName": "Clement Ivanov"
      },
      "roster": [
        {
          "pos": 1,
          "handle": "Satanic",
          "openDotaHandle": null,
          "realName": "Alan Gallyamov",
          "nationality": null,
          "rdyPlayerId": 16091,
          "photo": "assets/players/Parivision/Satanic.png",
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "No[o]ne-",
          "openDotaHandle": null,
          "realName": "Volodymyr Minenko",
          "nationality": null,
          "rdyPlayerId": 5425,
          "photo": "assets/players/Parivision/Noone.png",
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Noticed",
          "openDotaHandle": null,
          "realName": "Evgeniy Ignatenko",
          "nationality": null,
          "rdyPlayerId": 5428,
          "photo": "assets/players/Parivision/Noticed.png",
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "9Class",
          "openDotaHandle": null,
          "realName": "Edgar Naltakian",
          "nationality": null,
          "rdyPlayerId": 13521,
          "photo": "assets/players/Parivision/9class.png",
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "Dukalis",
          "openDotaHandle": null,
          "realName": "Andrey Kuropatkin",
          "nationality": null,
          "rdyPlayerId": 5080,
          "photo": "assets/players/Parivision/Dukalis.png",
          "facePosition": null
        }
      ],
      "notes": "Went 7-0 in series before the grand final."
    },
    {
      "key": "yandex",
      "name": "Team Yandex",
      "displayName": "Team Yandex",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "TY",
      "abbr": "TYX",
      "region": "Eastern Europe",
      "qualification": "Direct invite",
      "openDotaId": 9823272,
      "rdyTeamId": 445,
      "logo": "assets/teams/Yandex.webp",
      "logoNote": null,
      "colour": "#FC3F1D",
      "groupStage": {
        "seed": 10,
        "rank": 10,
        "seriesRecord": "2-3",
        "gameRecord": "7-7",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "huligani",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "liquid",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "aurora",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "resilience",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "ironwing",
            "score": "0-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "lgd",
        "score": "2-1",
        "result": "W",
        "advanced": true
      },
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "liquid",
          "score": "2-0",
          "result": "W"
        },
        {
          "round": "Upper Bracket Semifinal",
          "shortRound": "UB Semifinal",
          "bracket": "upper",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "nigma",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Upper Bracket Final",
          "shortRound": "UB Final",
          "bracket": "upper",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "vision",
          "score": "1-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Final",
          "shortRound": "LB Final",
          "bracket": "lower",
          "date": "2026-08-23",
          "seriesLength": "Bo3",
          "opponent": "spirit",
          "score": "0-2",
          "result": "L"
        }
      ],
      "placement": "3",
      "status": "Eliminated in the LB Final",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "watson",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5701,
          "photo": "assets/players/Yandex/Watson.png",
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "CHIRA_JUNIOR",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 6405,
          "photo": "assets/players/Yandex/Chira junion.png",
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "DM",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5044,
          "photo": "assets/players/Yandex/DM.png",
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Saksa",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5543,
          "photo": "assets/players/Yandex/Saksa.png",
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "Malady",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 14209,
          "photo": "assets/players/Yandex/Malady.png",
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "boomboys",
      "name": "BoomBoys",
      "displayName": "BoomBoys",
      "nameNote": "BetBoom Team, competing as BoomBoys",
      "alsoKnownAs": "BetBoom Team",
      "tag": "BB",
      "abbr": "BBM",
      "region": "Eastern Europe",
      "qualification": "Direct invite",
      "openDotaId": 8255888,
      "rdyTeamId": 56,
      "logo": "assets/teams/betboom.png",
      "logoNote": null,
      "colour": "#FFD400",
      "groupStage": {
        "seed": 12,
        "rank": 12,
        "seriesRecord": "2-3",
        "gameRecord": "5-7",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "og",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "ironwing",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "vision",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "aurora",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "falcons",
            "score": "1-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "aurora",
        "score": "2-0",
        "result": "W",
        "advanced": true
      },
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "vision",
          "score": "1-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Round 1",
          "shortRound": "LB Round 1",
          "bracket": "lower",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "ironwing",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Lower Bracket Quarterfinal",
          "shortRound": "LB Quarterfinal",
          "bracket": "lower",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "nigma",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Lower Bracket Semifinal",
          "shortRound": "LB Semifinal",
          "bracket": "lower",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "spirit",
          "score": "0-2",
          "result": "L"
        }
      ],
      "placement": "4",
      "status": "Eliminated in the LB Semifinal",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Kiritych~",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5258,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "gpk~",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5839,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "MieRo`",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5363,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Save-",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5553,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "Kataomi`",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5242,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "liquid",
      "name": "Team Liquid",
      "displayName": "Team Liquid",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "Liquid",
      "abbr": "LIQ",
      "region": "Western Europe",
      "qualification": "Direct invite",
      "openDotaId": 2163,
      "rdyTeamId": 48,
      "logo": "assets/teams/liquid.png",
      "logoNote": null,
      "colour": "#1B6FE0",
      "groupStage": {
        "seed": 2,
        "rank": 2,
        "seriesRecord": "4-1",
        "gameRecord": "9-5",
        "outcome": "main_event",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "vici",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "yandex",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "spirit",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "ironwing",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "aurora",
            "score": "2-1",
            "result": "W"
          }
        ]
      },
      "eliminationRound": null,
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "yandex",
          "score": "0-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Round 1",
          "shortRound": "LB Round 1",
          "bracket": "lower",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "falcons",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Lower Bracket Quarterfinal",
          "shortRound": "LB Quarterfinal",
          "bracket": "lower",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "spirit",
          "score": "0-2",
          "result": "L"
        }
      ],
      "placement": "5-6",
      "status": "Eliminated in the LB Quarterfinal",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "m1CKe",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5907,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Nisha",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5420,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Ace",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 4920,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Boxi",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 4998,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "tOfu",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5977,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": "Beat Team Falcons 2-1 in the lower bracket."
    },
    {
      "key": "nigma",
      "name": "Nigma Galaxy",
      "displayName": "Nigma Galaxy",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "NGX",
      "abbr": "NGX",
      "region": "Europe",
      "qualification": "Europe qualifier",
      "openDotaId": 10136357,
      "rdyTeamId": null,
      "logo": null,
      "logoNote": null,
      "colour": "#00B37E",
      "groupStage": {
        "seed": 3,
        "rank": 3,
        "seriesRecord": "4-1",
        "gameRecord": "8-2",
        "outcome": "main_event",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "ironwing",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "og",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "lgd",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "vici",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "spirit",
            "score": "2-0",
            "result": "W"
          }
        ]
      },
      "eliminationRound": null,
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "falcons",
          "score": "2-1",
          "result": "W"
        },
        {
          "round": "Upper Bracket Semifinal",
          "shortRound": "UB Semifinal",
          "bracket": "upper",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "yandex",
          "score": "1-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Quarterfinal",
          "shortRound": "LB Quarterfinal",
          "bracket": "lower",
          "date": "2026-08-22",
          "seriesLength": "Bo3",
          "opponent": "boomboys",
          "score": "1-2",
          "result": "L"
        }
      ],
      "placement": "5-6",
      "status": "Eliminated in the LB Quarterfinal",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "SumaiL",
          "openDotaHandle": null,
          "realName": "Syed Sumail Hassan",
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "lorenof",
          "openDotaHandle": null,
          "realName": "Artem Melnick",
          "nationality": "Ukraine",
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Davai",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "OmaR",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "GH",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": "Longest average winning duration of the event at 55:36."
    },
    {
      "key": "ironwing",
      "name": "Iron Wing",
      "displayName": "Iron Wing",
      "nameNote": "1win Team, using the Tundra Esports invite slot",
      "alsoKnownAs": "1win Team",
      "tag": "IW",
      "abbr": "IWG",
      "region": "Western Europe",
      "qualification": "Direct invite (Tundra Esports slot)",
      "openDotaId": 10150413,
      "rdyTeamId": 482,
      "logo": null,
      "logoNote": "No crest on file. assets/teams/1win.png is a stock photograph, not a mark.",
      "colour": "#4C6EF5",
      "groupStage": {
        "seed": 4,
        "rank": 4,
        "seriesRecord": "3-2",
        "gameRecord": "8-6",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "nigma",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "boomboys",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "falcons",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "liquid",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "yandex",
            "score": "2-0",
            "result": "W"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "gamerlegion",
        "score": "2-0",
        "result": "W",
        "advanced": true
      },
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "spirit",
          "score": "0-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Round 1",
          "shortRound": "LB Round 1",
          "bracket": "lower",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "boomboys",
          "score": "1-2",
          "result": "L"
        }
      ],
      "placement": "7-8",
      "status": "Eliminated in the LB Round 1",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Pure",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5482,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "bzm",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5788,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "33",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 4887,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Ari",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5386,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "Whitemon",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5706,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "falcons",
      "name": "Team Falcons",
      "displayName": "Team Falcons",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "FLCN",
      "abbr": "FLC",
      "region": "Western Europe",
      "qualification": "Direct invite",
      "openDotaId": 9247354,
      "rdyTeamId": 53,
      "logo": "assets/teams/falcons.png",
      "logoNote": null,
      "colour": "#00B140",
      "groupStage": {
        "seed": 5,
        "rank": 5,
        "seriesRecord": "3-2",
        "gameRecord": "8-7",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "lgd",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "vision",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "ironwing",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "gamerlegion",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "boomboys",
            "score": "2-1",
            "result": "W"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "vici",
        "score": "2-0",
        "result": "W",
        "advanced": true
      },
      "mainEventSeries": [
        {
          "round": "Upper Bracket Round 1",
          "shortRound": "UB Round 1",
          "bracket": "upper",
          "date": "2026-08-20",
          "seriesLength": "Bo3",
          "opponent": "nigma",
          "score": "1-2",
          "result": "L"
        },
        {
          "round": "Lower Bracket Round 1",
          "shortRound": "LB Round 1",
          "bracket": "lower",
          "date": "2026-08-21",
          "seriesLength": "Bo3",
          "opponent": "liquid",
          "score": "1-2",
          "result": "L"
        }
      ],
      "placement": "7-8",
      "status": "Eliminated in the LB Round 1",
      "prize": null,
      "coach": {
        "handle": "Aui_2000",
        "realName": "Kurtis Ling"
      },
      "roster": [
        {
          "pos": 1,
          "handle": "skiter",
          "openDotaHandle": null,
          "realName": "Oliver Lepko",
          "nationality": null,
          "rdyPlayerId": 5966,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Malr1ne",
          "openDotaHandle": null,
          "realName": "Stanislav Potorak",
          "nationality": null,
          "rdyPlayerId": 5336,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "ATF",
          "openDotaHandle": "AMMAR_THE_F",
          "realName": "Ammar Al-Assaf",
          "nationality": null,
          "rdyPlayerId": 4911,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Cr1t-",
          "openDotaHandle": null,
          "realName": "Andreas Nielsen",
          "nationality": null,
          "rdyPlayerId": 5031,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "Sneyking",
          "openDotaHandle": null,
          "realName": "Wu Jingjun",
          "nationality": null,
          "rdyPlayerId": 5593,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "vici",
      "name": "Vici Gaming",
      "displayName": "Vici Gaming",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "VG",
      "abbr": "VCG",
      "region": "China",
      "qualification": "China qualifier",
      "openDotaId": 726228,
      "rdyTeamId": null,
      "logo": null,
      "logoNote": null,
      "colour": "#F5C518",
      "groupStage": {
        "seed": 13,
        "rank": 13,
        "seriesRecord": "2-3",
        "gameRecord": "4-8",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "liquid",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "huligani",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "gamerlegion",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "nigma",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "lgd",
            "score": "0-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "falcons",
        "score": "0-2",
        "result": "L",
        "advanced": false
      },
      "mainEventSeries": [],
      "placement": "9-13",
      "status": "Eliminated in the Elimination Round",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "shiro",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Xm",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Bach",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "XinQ",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "y`",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "aurora",
      "name": "Aurora Gaming",
      "displayName": "Aurora Gaming",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "Aurora",
      "abbr": "AUR",
      "region": "Eastern Europe",
      "qualification": "Direct invite",
      "openDotaId": 9467224,
      "rdyTeamId": 464,
      "logo": "assets/teams/aurora.png",
      "logoNote": null,
      "colour": "#A24BFF",
      "groupStage": {
        "seed": 6,
        "rank": 6,
        "seriesRecord": "3-2",
        "gameRecord": "7-5",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "gamerlegion",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "spirit",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "yandex",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "boomboys",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "liquid",
            "score": "1-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "boomboys",
        "score": "0-2",
        "result": "L",
        "advanced": false
      },
      "mainEventSeries": [],
      "placement": "9-13",
      "status": "Eliminated in the Elimination Round",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Nightfall",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5415,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Mikoto",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5365,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Ws",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5710,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Mira",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5369,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "kaori",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5877,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "resilience",
      "name": "Team Resilience",
      "displayName": "Team Resilience",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "Resilience",
      "abbr": "RES",
      "region": "China",
      "qualification": "China qualifier",
      "openDotaId": 5017210,
      "rdyTeamId": null,
      "logo": null,
      "logoNote": null,
      "colour": "#E8552D",
      "groupStage": {
        "seed": 9,
        "rank": 9,
        "seriesRecord": "2-3",
        "gameRecord": "7-6",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "vision",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "lgd",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "og",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "yandex",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "xtreme",
            "score": "2-0",
            "result": "W"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "spirit",
        "score": "1-2",
        "result": "L",
        "advanced": false
      },
      "mainEventSeries": [],
      "placement": "9-13",
      "status": "Eliminated in the Elimination Round",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "YSR-04E",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Echozz",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "niu",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "planet",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "zzq",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "gamerlegion",
      "name": "GamerLegion",
      "displayName": "GamerLegion",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "GL",
      "abbr": "GLG",
      "region": "North America",
      "qualification": "North America qualifier",
      "openDotaId": 9964962,
      "rdyTeamId": null,
      "logo": null,
      "logoNote": null,
      "colour": "#F2B705",
      "groupStage": {
        "seed": 11,
        "rank": 11,
        "seriesRecord": "2-3",
        "gameRecord": "6-6",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "aurora",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "xtreme",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "vici",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "falcons",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "og",
            "score": "2-0",
            "result": "W"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "ironwing",
        "score": "0-2",
        "result": "L",
        "advanced": false
      },
      "mainEventSeries": [],
      "placement": "9-13",
      "status": "Eliminated in the Elimination Round",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Ghost",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "RCY",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Fayde",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Bignum",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "Speeed",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "lgd",
      "name": "LGD Gaming",
      "displayName": "LGD Gaming",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "LGD",
      "abbr": "LGD",
      "region": "South America",
      "qualification": "South America qualifier",
      "openDotaId": 10150538,
      "rdyTeamId": null,
      "logo": "assets/teams/lgd-gaming.png",
      "logoNote": null,
      "colour": "#C8102E",
      "groupStage": {
        "seed": 7,
        "rank": 7,
        "seriesRecord": "3-2",
        "gameRecord": "7-6",
        "outcome": "elimination_round",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "falcons",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "resilience",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "nigma",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "xtreme",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "vici",
            "score": "2-0",
            "result": "W"
          }
        ]
      },
      "eliminationRound": {
        "date": "2026-08-16",
        "opponent": "yandex",
        "score": "1-2",
        "result": "L",
        "advanced": false
      },
      "mainEventSeries": [],
      "placement": "9-13",
      "status": "Eliminated in the Elimination Round",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Yuma",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5749,
          "photo": "assets/players/LGD/Yuma.png",
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Topson",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 6808,
          "photo": "assets/players/LGD/Topson.png",
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Wisper",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5708,
          "photo": "assets/players/LGD/Wisper.png",
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "Thiolicor",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5649,
          "photo": "assets/players/LGD/Thiolicor.png",
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "KJ",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5232,
          "photo": "assets/players/LGD/KJ.png",
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "xtreme",
      "name": "Xtreme Gaming",
      "displayName": "Xtreme Gaming",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "XG",
      "abbr": "XTG",
      "region": "China",
      "qualification": "Direct invite",
      "openDotaId": 8261500,
      "rdyTeamId": 72,
      "logo": "assets/teams/xtreme.png",
      "logoNote": null,
      "colour": "#FF6B00",
      "groupStage": {
        "seed": 14,
        "rank": 14,
        "seriesRecord": "1-4",
        "gameRecord": "3-8",
        "outcome": "eliminated",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "spirit",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "gamerlegion",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "huligani",
            "score": "2-0",
            "result": "W"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "lgd",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "resilience",
            "score": "0-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": null,
      "mainEventSeries": [],
      "placement": "14-15",
      "status": "Eliminated in the Group Stage",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Ame",
          "openDotaHandle": null,
          "realName": "Wang Chunyu",
          "nationality": "China",
          "rdyPlayerId": 4937,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "NothingToSay",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5427,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Xxs",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5724,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "fy",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5833,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "xNova",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": 5996,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "og",
      "name": "OG",
      "displayName": "OG",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "OG",
      "abbr": "OGO",
      "region": "Southeast Asia",
      "qualification": "Southeast Asia qualifier",
      "openDotaId": 2586976,
      "rdyTeamId": null,
      "logo": "assets/teams/og.png",
      "logoNote": null,
      "colour": "#2FBF71",
      "groupStage": {
        "seed": 15,
        "rank": 15,
        "seriesRecord": "1-4",
        "gameRecord": "2-9",
        "outcome": "eliminated",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "boomboys",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-13",
            "opponent": "nigma",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "resilience",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "huligani",
            "score": "2-1",
            "result": "W"
          },
          {
            "round": "Round 5",
            "date": "2026-08-15",
            "opponent": "gamerlegion",
            "score": "0-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": null,
      "mainEventSeries": [],
      "placement": "14-15",
      "status": "Eliminated in the Group Stage",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "Natsumi",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Yopaj-",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Raven",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "TIMS",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "skem",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": null
    },
    {
      "key": "huligani",
      "name": "HULIGANI",
      "displayName": "HULIGANI",
      "nameNote": null,
      "alsoKnownAs": null,
      "tag": "HU",
      "abbr": "HUL",
      "region": "Europe",
      "qualification": "Europe qualifier",
      "openDotaId": 10149530,
      "rdyTeamId": null,
      "logo": null,
      "logoNote": null,
      "colour": "#7A8899",
      "groupStage": {
        "seed": 16,
        "rank": 16,
        "seriesRecord": "0-4",
        "gameRecord": "2-8",
        "outcome": "eliminated",
        "roundResults": [
          {
            "round": "Round 1",
            "date": "2026-08-13",
            "opponent": "yandex",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 2",
            "date": "2026-08-14",
            "opponent": "vici",
            "score": "1-2",
            "result": "L"
          },
          {
            "round": "Round 3",
            "date": "2026-08-14",
            "opponent": "xtreme",
            "score": "0-2",
            "result": "L"
          },
          {
            "round": "Round 4",
            "date": "2026-08-15",
            "opponent": "og",
            "score": "1-2",
            "result": "L"
          }
        ]
      },
      "eliminationRound": null,
      "mainEventSeries": [],
      "placement": "16",
      "status": "Eliminated in the Group Stage",
      "prize": null,
      "coach": null,
      "roster": [
        {
          "pos": 1,
          "handle": "ssnovv1",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 2,
          "handle": "Mirage`",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 3,
          "handle": "Corrupted",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 4,
          "handle": "sayuw",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        },
        {
          "pos": 5,
          "handle": "RESPECT",
          "openDotaHandle": null,
          "realName": null,
          "nationality": null,
          "rdyPlayerId": null,
          "photo": null,
          "facePosition": null
        }
      ],
      "notes": "Only team to finish the Swiss stage without a series win."
    }
  ],
  "groupStage": {
    "system": "Swiss",
    "dates": "2026-08-13 to 2026-08-16",
    "seriesLength": "Bo3",
    "roundsCount": 5,
    "rounds": [
      {
        "round": "Round 1",
        "date": "2026-08-13",
        "dates": [
          "2026-08-13"
        ],
        "series": [
          {
            "teamA": "falcons",
            "teamB": "lgd",
            "score": "2-1",
            "winner": "falcons",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "nigma",
            "teamB": "ironwing",
            "score": "0-2",
            "winner": "ironwing",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "boomboys",
            "teamB": "og",
            "score": "2-0",
            "winner": "boomboys",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "vision",
            "teamB": "resilience",
            "score": "2-1",
            "winner": "vision",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "spirit",
            "teamB": "xtreme",
            "score": "2-0",
            "winner": "spirit",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "liquid",
            "teamB": "vici",
            "score": "2-0",
            "winner": "liquid",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "aurora",
            "teamB": "gamerlegion",
            "score": "2-0",
            "winner": "aurora",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "yandex",
            "teamB": "huligani",
            "score": "2-0",
            "winner": "yandex",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Round 2",
        "date": "2026-08-13",
        "dates": [
          "2026-08-13",
          "2026-08-14"
        ],
        "series": [
          {
            "teamA": "boomboys",
            "teamB": "ironwing",
            "score": "2-1",
            "winner": "boomboys",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "vision",
            "teamB": "falcons",
            "score": "2-1",
            "winner": "vision",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "lgd",
            "teamB": "resilience",
            "score": "2-1",
            "winner": "lgd",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "nigma",
            "teamB": "og",
            "score": "2-0",
            "winner": "nigma",
            "date": "2026-08-13",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "spirit",
            "teamB": "aurora",
            "score": "2-0",
            "winner": "spirit",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "yandex",
            "teamB": "liquid",
            "score": "1-2",
            "winner": "liquid",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "xtreme",
            "teamB": "gamerlegion",
            "score": "0-2",
            "winner": "gamerlegion",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "huligani",
            "teamB": "vici",
            "score": "1-2",
            "winner": "vici",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Round 3",
        "date": "2026-08-14",
        "dates": [
          "2026-08-14"
        ],
        "series": [
          {
            "teamA": "boomboys",
            "teamB": "vision",
            "score": "0-2",
            "winner": "vision",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "spirit",
            "teamB": "liquid",
            "score": "2-1",
            "winner": "spirit",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "ironwing",
            "teamB": "falcons",
            "score": "2-1",
            "winner": "ironwing",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "lgd",
            "teamB": "nigma",
            "score": "0-2",
            "winner": "nigma",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "aurora",
            "teamB": "yandex",
            "score": "2-1",
            "winner": "aurora",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "vici",
            "teamB": "gamerlegion",
            "score": "2-1",
            "winner": "vici",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "resilience",
            "teamB": "og",
            "score": "2-0",
            "winner": "resilience",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "xtreme",
            "teamB": "huligani",
            "score": "2-0",
            "winner": "xtreme",
            "date": "2026-08-14",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Round 4",
        "date": "2026-08-15",
        "dates": [
          "2026-08-15"
        ],
        "series": [
          {
            "teamA": "vision",
            "teamB": "spirit",
            "score": "2-0",
            "winner": "vision",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "ironwing",
            "teamB": "liquid",
            "score": "1-2",
            "winner": "liquid",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "boomboys",
            "teamB": "aurora",
            "score": "0-2",
            "winner": "aurora",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "nigma",
            "teamB": "vici",
            "score": "2-0",
            "winner": "nigma",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "lgd",
            "teamB": "xtreme",
            "score": "2-1",
            "winner": "lgd",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "falcons",
            "teamB": "gamerlegion",
            "score": "2-1",
            "winner": "falcons",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "resilience",
            "teamB": "yandex",
            "score": "1-2",
            "winner": "yandex",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "og",
            "teamB": "huligani",
            "score": "2-1",
            "winner": "og",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Round 5",
        "date": "2026-08-15",
        "dates": [
          "2026-08-15"
        ],
        "series": [
          {
            "teamA": "liquid",
            "teamB": "aurora",
            "score": "2-1",
            "winner": "liquid",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "nigma",
            "teamB": "spirit",
            "score": "2-0",
            "winner": "nigma",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "boomboys",
            "teamB": "falcons",
            "score": "1-2",
            "winner": "falcons",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "lgd",
            "teamB": "vici",
            "score": "2-0",
            "winner": "lgd",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "ironwing",
            "teamB": "yandex",
            "score": "2-0",
            "winner": "ironwing",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "resilience",
            "teamB": "xtreme",
            "score": "2-0",
            "winner": "resilience",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "og",
            "teamB": "gamerlegion",
            "score": "0-2",
            "winner": "gamerlegion",
            "date": "2026-08-15",
            "seriesLength": "Bo3"
          }
        ]
      }
    ],
    "standings": [
      {
        "rank": 1,
        "teamKey": "vision",
        "seriesRecord": "4-0",
        "wins": 4,
        "losses": 0,
        "gameRecord": "8-2",
        "gameWins": 8,
        "gameLosses": 2,
        "outcome": "main_event",
        "outcomeLabel": "Advanced directly to Main Event"
      },
      {
        "rank": 2,
        "teamKey": "liquid",
        "seriesRecord": "4-1",
        "wins": 4,
        "losses": 1,
        "gameRecord": "9-5",
        "gameWins": 9,
        "gameLosses": 5,
        "outcome": "main_event",
        "outcomeLabel": "Advanced directly to Main Event"
      },
      {
        "rank": 3,
        "teamKey": "nigma",
        "seriesRecord": "4-1",
        "wins": 4,
        "losses": 1,
        "gameRecord": "8-2",
        "gameWins": 8,
        "gameLosses": 2,
        "outcome": "main_event",
        "outcomeLabel": "Advanced directly to Main Event"
      },
      {
        "rank": 4,
        "teamKey": "ironwing",
        "seriesRecord": "3-2",
        "wins": 3,
        "losses": 2,
        "gameRecord": "8-6",
        "gameWins": 8,
        "gameLosses": 6,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 5,
        "teamKey": "falcons",
        "seriesRecord": "3-2",
        "wins": 3,
        "losses": 2,
        "gameRecord": "8-7",
        "gameWins": 8,
        "gameLosses": 7,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 6,
        "teamKey": "aurora",
        "seriesRecord": "3-2",
        "wins": 3,
        "losses": 2,
        "gameRecord": "7-5",
        "gameWins": 7,
        "gameLosses": 5,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 7,
        "teamKey": "lgd",
        "seriesRecord": "3-2",
        "wins": 3,
        "losses": 2,
        "gameRecord": "7-6",
        "gameWins": 7,
        "gameLosses": 6,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 8,
        "teamKey": "spirit",
        "seriesRecord": "3-2",
        "wins": 3,
        "losses": 2,
        "gameRecord": "6-5",
        "gameWins": 6,
        "gameLosses": 5,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 9,
        "teamKey": "resilience",
        "seriesRecord": "2-3",
        "wins": 2,
        "losses": 3,
        "gameRecord": "7-6",
        "gameWins": 7,
        "gameLosses": 6,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 10,
        "teamKey": "yandex",
        "seriesRecord": "2-3",
        "wins": 2,
        "losses": 3,
        "gameRecord": "7-7",
        "gameWins": 7,
        "gameLosses": 7,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 11,
        "teamKey": "gamerlegion",
        "seriesRecord": "2-3",
        "wins": 2,
        "losses": 3,
        "gameRecord": "6-6",
        "gameWins": 6,
        "gameLosses": 6,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 12,
        "teamKey": "boomboys",
        "seriesRecord": "2-3",
        "wins": 2,
        "losses": 3,
        "gameRecord": "5-7",
        "gameWins": 5,
        "gameLosses": 7,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 13,
        "teamKey": "vici",
        "seriesRecord": "2-3",
        "wins": 2,
        "losses": 3,
        "gameRecord": "4-8",
        "gameWins": 4,
        "gameLosses": 8,
        "outcome": "elimination_round",
        "outcomeLabel": "Elimination Round"
      },
      {
        "rank": 14,
        "teamKey": "xtreme",
        "seriesRecord": "1-4",
        "wins": 1,
        "losses": 4,
        "gameRecord": "3-8",
        "gameWins": 3,
        "gameLosses": 8,
        "outcome": "eliminated",
        "outcomeLabel": "Eliminated"
      },
      {
        "rank": 15,
        "teamKey": "og",
        "seriesRecord": "1-4",
        "wins": 1,
        "losses": 4,
        "gameRecord": "2-9",
        "gameWins": 2,
        "gameLosses": 9,
        "outcome": "eliminated",
        "outcomeLabel": "Eliminated"
      },
      {
        "rank": 16,
        "teamKey": "huligani",
        "seriesRecord": "0-4",
        "wins": 0,
        "losses": 4,
        "gameRecord": "2-8",
        "gameWins": 2,
        "gameLosses": 8,
        "outcome": "eliminated",
        "outcomeLabel": "Eliminated"
      }
    ],
    "tiebreakNote": "Series and game records are confirmed against OpenDota. The order inside each win bracket follows the published table and is cosmetic, Swiss tiebreaks were not published."
  },
  "eliminationRound": {
    "date": "2026-08-16",
    "seriesLength": "Bo3",
    "series": [
      {
        "teamA": "falcons",
        "teamB": "vici",
        "score": "2-0",
        "winner": "falcons",
        "date": "2026-08-16",
        "seriesLength": "Bo3"
      },
      {
        "teamA": "aurora",
        "teamB": "boomboys",
        "score": "0-2",
        "winner": "boomboys",
        "date": "2026-08-16",
        "seriesLength": "Bo3"
      },
      {
        "teamA": "spirit",
        "teamB": "resilience",
        "score": "2-1",
        "winner": "spirit",
        "date": "2026-08-16",
        "seriesLength": "Bo3"
      },
      {
        "teamA": "ironwing",
        "teamB": "gamerlegion",
        "score": "2-0",
        "winner": "ironwing",
        "date": "2026-08-16",
        "seriesLength": "Bo3"
      },
      {
        "teamA": "lgd",
        "teamB": "yandex",
        "score": "1-2",
        "winner": "yandex",
        "date": "2026-08-16",
        "seriesLength": "Bo3"
      }
    ],
    "advanced": [
      "falcons",
      "boomboys",
      "spirit",
      "ironwing",
      "yandex"
    ],
    "eliminated": [
      "vici",
      "aurora",
      "resilience",
      "gamerlegion",
      "lgd"
    ],
    "pairingRule": "The five teams on 3-2 were paired against the five teams on 2-3. Verified against OpenDota."
  },
  "bracket": {
    "format": "Double elimination, 8 teams, no bracket reset in the grand final",
    "dates": "2026-08-20 to 2026-08-23",
    "upper": [
      {
        "round": "Upper Bracket Round 1",
        "shortRound": "UB Round 1",
        "date": "2026-08-20",
        "series": [
          {
            "teamA": "ironwing",
            "teamB": "spirit",
            "score": "0-2",
            "winner": "spirit",
            "eliminated": null,
            "date": "2026-08-20",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "vision",
            "teamB": "boomboys",
            "score": "2-1",
            "winner": "vision",
            "eliminated": null,
            "date": "2026-08-20",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "liquid",
            "teamB": "yandex",
            "score": "0-2",
            "winner": "yandex",
            "eliminated": null,
            "date": "2026-08-20",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "nigma",
            "teamB": "falcons",
            "score": "2-1",
            "winner": "nigma",
            "eliminated": null,
            "date": "2026-08-20",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Upper Bracket Semifinal",
        "shortRound": "UB Semifinal",
        "date": "2026-08-21",
        "series": [
          {
            "teamA": "spirit",
            "teamB": "vision",
            "score": "1-2",
            "winner": "vision",
            "eliminated": null,
            "date": "2026-08-21",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "yandex",
            "teamB": "nigma",
            "score": "2-1",
            "winner": "yandex",
            "eliminated": null,
            "date": "2026-08-21",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Upper Bracket Final",
        "shortRound": "UB Final",
        "date": "2026-08-22",
        "series": [
          {
            "teamA": "vision",
            "teamB": "yandex",
            "score": "2-1",
            "winner": "vision",
            "eliminated": null,
            "date": "2026-08-22",
            "seriesLength": "Bo3"
          }
        ]
      }
    ],
    "lower": [
      {
        "round": "Lower Bracket Round 1",
        "shortRound": "LB Round 1",
        "date": "2026-08-21",
        "series": [
          {
            "teamA": "ironwing",
            "teamB": "boomboys",
            "score": "1-2",
            "winner": "boomboys",
            "eliminated": "ironwing",
            "date": "2026-08-21",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "liquid",
            "teamB": "falcons",
            "score": "2-1",
            "winner": "liquid",
            "eliminated": "falcons",
            "date": "2026-08-21",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Lower Bracket Quarterfinal",
        "shortRound": "LB Quarterfinal",
        "date": "2026-08-22",
        "series": [
          {
            "teamA": "spirit",
            "teamB": "liquid",
            "score": "2-0",
            "winner": "spirit",
            "eliminated": "liquid",
            "date": "2026-08-22",
            "seriesLength": "Bo3"
          },
          {
            "teamA": "nigma",
            "teamB": "boomboys",
            "score": "1-2",
            "winner": "boomboys",
            "eliminated": "nigma",
            "date": "2026-08-22",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Lower Bracket Semifinal",
        "shortRound": "LB Semifinal",
        "date": "2026-08-22",
        "series": [
          {
            "teamA": "boomboys",
            "teamB": "spirit",
            "score": "0-2",
            "winner": "spirit",
            "eliminated": "boomboys",
            "date": "2026-08-22",
            "seriesLength": "Bo3"
          }
        ]
      },
      {
        "round": "Lower Bracket Final",
        "shortRound": "LB Final",
        "date": "2026-08-23",
        "series": [
          {
            "teamA": "yandex",
            "teamB": "spirit",
            "score": "0-2",
            "winner": "spirit",
            "eliminated": "yandex",
            "date": "2026-08-23",
            "seriesLength": "Bo3"
          }
        ]
      }
    ],
    "grandFinal": {
      "round": "Grand Final",
      "shortRound": "Grand Final",
      "teamA": "vision",
      "teamB": "spirit",
      "score": "2-2",
      "status": "live",
      "game": 5,
      "winner": null,
      "date": "2026-08-23",
      "seriesLength": "Bo5",
      "venue": "Shanghai Oriental Sports Center"
    }
  },
  "grandFinal": {
    "date": "2026-08-23",
    "venue": "Shanghai Oriental Sports Center",
    "seriesLength": "Bo5",
    "teamA": "spirit",
    "teamB": "vision",
    "score": "2-2",
    "seriesScore": {
      "spirit": 2,
      "vision": 2
    },
    "status": "live",
    "currentGame": 5,
    "winner": null,
    "seriesContext": "Two games each. TEAM VISION took game two on the back of the longest game of the final and game four with the Doom that has not lost all event. Team Spirit took game one 42-17 and game three after a decisive thirty-eighth minute fight. Game five is the decider, VISION on Radiant, Spirit on Dire.",
    "preDeciderNote": "Series state frozen at 2-2 with game five in progress. No result, champion or MVP is recorded in this file.",
    "games": [
      {
        "game": 1,
        "matchId": 8960577698,
        "startTimeUtc": "2026-08-23T06:15:57Z",
        "radiant": "spirit",
        "dire": "vision",
        "draft": [
          {
            "order": 1,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "winter_wyvern",
            "heroDisplay": "Winter Wyvern",
            "portrait": "assets/dota2_portraits/winter_wyvern.png"
          },
          {
            "order": 2,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "rattletrap",
            "heroDisplay": "Clockwerk",
            "portrait": "assets/dota2_portraits/rattletrap.png"
          },
          {
            "order": 3,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "bounty_hunter",
            "heroDisplay": "Bounty Hunter",
            "portrait": "assets/dota2_portraits/bounty_hunter.png"
          },
          {
            "order": 4,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "treant",
            "heroDisplay": "Treant Protector",
            "portrait": "assets/dota2_portraits/treant.png"
          },
          {
            "order": 5,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "bane",
            "heroDisplay": "Bane",
            "portrait": "assets/dota2_portraits/bane.png"
          },
          {
            "order": 6,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "earth_spirit",
            "heroDisplay": "Earth Spirit",
            "portrait": "assets/dota2_portraits/earth_spirit.png"
          },
          {
            "order": 7,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "keeper_of_the_light",
            "heroDisplay": "Keeper of the Light",
            "portrait": "assets/dota2_portraits/keeper_of_the_light.png"
          },
          {
            "order": 8,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "ember_spirit",
            "heroDisplay": "Ember Spirit",
            "portrait": "assets/dota2_portraits/ember_spirit.png"
          },
          {
            "order": 9,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "slark",
            "heroDisplay": "Slark",
            "portrait": "assets/dota2_portraits/slark.png"
          },
          {
            "order": 10,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "doom_bringer",
            "heroDisplay": "Doom",
            "portrait": "assets/dota2_portraits/doom_bringer.png"
          },
          {
            "order": 11,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "abyssal_underlord",
            "heroDisplay": "Underlord",
            "portrait": "assets/dota2_portraits/abyssal_underlord.png"
          },
          {
            "order": 12,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "dark_seer",
            "heroDisplay": "Dark Seer",
            "portrait": "assets/dota2_portraits/dark_seer.png"
          },
          {
            "order": 13,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png"
          },
          {
            "order": 14,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "mirana",
            "heroDisplay": "Mirana",
            "portrait": "assets/dota2_portraits/mirana.png"
          },
          {
            "order": 15,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "wisp",
            "heroDisplay": "Io",
            "portrait": "assets/dota2_portraits/wisp.png"
          },
          {
            "order": 16,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png"
          },
          {
            "order": 17,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "disruptor",
            "heroDisplay": "Disruptor",
            "portrait": "assets/dota2_portraits/disruptor.png"
          },
          {
            "order": 18,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png"
          },
          {
            "order": 19,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "tidehunter",
            "heroDisplay": "Tidehunter",
            "portrait": "assets/dota2_portraits/tidehunter.png"
          },
          {
            "order": 20,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "kez",
            "heroDisplay": "Kez",
            "portrait": "assets/dota2_portraits/kez.png"
          },
          {
            "order": 21,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png"
          },
          {
            "order": 22,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "furion",
            "heroDisplay": "Nature's Prophet",
            "portrait": "assets/dota2_portraits/furion.png"
          },
          {
            "order": 23,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "hoodwink",
            "heroDisplay": "Hoodwink",
            "portrait": "assets/dota2_portraits/hoodwink.png"
          },
          {
            "order": 24,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "undying",
            "heroDisplay": "Undying",
            "portrait": "assets/dota2_portraits/undying.png"
          }
        ],
        "status": "final",
        "winner": "spirit",
        "duration": "46:15",
        "durationSeconds": 2775,
        "killScore": {
          "radiant": 42,
          "dire": 17
        },
        "players": [
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "Yatoro",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png",
            "kills": 16,
            "deaths": 1,
            "assists": 7,
            "netWorth": 37249,
            "goldEarned": 40237,
            "gpm": 870,
            "xpm": 1045,
            "lastHits": 596,
            "heroDamage": 42758
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "Larl",
            "hero": "slark",
            "heroDisplay": "Slark",
            "portrait": "assets/dota2_portraits/slark.png",
            "kills": 6,
            "deaths": 4,
            "assists": 18,
            "netWorth": 21228,
            "goldEarned": 23356,
            "gpm": 505,
            "xpm": 714,
            "lastHits": 271,
            "heroDamage": 19626
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "Collapse",
            "hero": "undying",
            "heroDisplay": "Undying",
            "portrait": "assets/dota2_portraits/undying.png",
            "kills": 11,
            "deaths": 3,
            "assists": 14,
            "netWorth": 27460,
            "goldEarned": 28721,
            "gpm": 621,
            "xpm": 949,
            "lastHits": 337,
            "heroDamage": 20550
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "not_me",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png",
            "kills": 5,
            "deaths": 5,
            "assists": 21,
            "netWorth": 12195,
            "goldEarned": 17020,
            "gpm": 368,
            "xpm": 547,
            "lastHits": 35,
            "heroDamage": 17476
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "rue",
            "hero": "disruptor",
            "heroDisplay": "Disruptor",
            "portrait": "assets/dota2_portraits/disruptor.png",
            "kills": 2,
            "deaths": 4,
            "assists": 28,
            "netWorth": 14223,
            "goldEarned": 15262,
            "gpm": 330,
            "xpm": 534,
            "lastHits": 38,
            "heroDamage": 13885
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "Satanic",
            "hero": "ember_spirit",
            "heroDisplay": "Ember Spirit",
            "portrait": "assets/dota2_portraits/ember_spirit.png",
            "kills": 3,
            "deaths": 5,
            "assists": 5,
            "netWorth": 22530,
            "goldEarned": 24651,
            "gpm": 533,
            "xpm": 719,
            "lastHits": 440,
            "heroDamage": 36257
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "No[o]ne-",
            "hero": "wisp",
            "heroDisplay": "Io",
            "portrait": "assets/dota2_portraits/wisp.png",
            "kills": 4,
            "deaths": 4,
            "assists": 7,
            "netWorth": 22783,
            "goldEarned": 27333,
            "gpm": 591,
            "xpm": 800,
            "lastHits": 503,
            "heroDamage": 36118
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "Noticed",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png",
            "kills": 2,
            "deaths": 8,
            "assists": 9,
            "netWorth": 15424,
            "goldEarned": 19147,
            "gpm": 414,
            "xpm": 508,
            "lastHits": 252,
            "heroDamage": 14235
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "9Class",
            "hero": "hoodwink",
            "heroDisplay": "Hoodwink",
            "portrait": "assets/dota2_portraits/hoodwink.png",
            "kills": 5,
            "deaths": 14,
            "assists": 8,
            "netWorth": 8869,
            "goldEarned": 13875,
            "gpm": 300,
            "xpm": 399,
            "lastHits": 71,
            "heroDamage": 21452
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "Dukalis",
            "hero": "mirana",
            "heroDisplay": "Mirana",
            "portrait": "assets/dota2_portraits/mirana.png",
            "kills": 3,
            "deaths": 11,
            "assists": 9,
            "netWorth": 8846,
            "goldEarned": 14661,
            "gpm": 317,
            "xpm": 352,
            "lastHits": 93,
            "heroDamage": 24422
          }
        ]
      },
      {
        "game": 2,
        "matchId": 8960655084,
        "startTimeUtc": "2026-08-23T07:36:03Z",
        "radiant": "vision",
        "dire": "spirit",
        "draft": [
          {
            "order": 1,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "bounty_hunter",
            "heroDisplay": "Bounty Hunter",
            "portrait": "assets/dota2_portraits/bounty_hunter.png"
          },
          {
            "order": 2,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png"
          },
          {
            "order": 3,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "treant",
            "heroDisplay": "Treant Protector",
            "portrait": "assets/dota2_portraits/treant.png"
          },
          {
            "order": 4,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "rattletrap",
            "heroDisplay": "Clockwerk",
            "portrait": "assets/dota2_portraits/rattletrap.png"
          },
          {
            "order": 5,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "furion",
            "heroDisplay": "Nature's Prophet",
            "portrait": "assets/dota2_portraits/furion.png"
          },
          {
            "order": 6,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "bane",
            "heroDisplay": "Bane",
            "portrait": "assets/dota2_portraits/bane.png"
          },
          {
            "order": 7,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "winter_wyvern",
            "heroDisplay": "Winter Wyvern",
            "portrait": "assets/dota2_portraits/winter_wyvern.png"
          },
          {
            "order": 8,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png"
          },
          {
            "order": 9,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "earth_spirit",
            "heroDisplay": "Earth Spirit",
            "portrait": "assets/dota2_portraits/earth_spirit.png"
          },
          {
            "order": 10,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "dark_seer",
            "heroDisplay": "Dark Seer",
            "portrait": "assets/dota2_portraits/dark_seer.png"
          },
          {
            "order": 11,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "keeper_of_the_light",
            "heroDisplay": "Keeper of the Light",
            "portrait": "assets/dota2_portraits/keeper_of_the_light.png"
          },
          {
            "order": 12,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "doom_bringer",
            "heroDisplay": "Doom",
            "portrait": "assets/dota2_portraits/doom_bringer.png"
          },
          {
            "order": 13,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "enchantress",
            "heroDisplay": "Enchantress",
            "portrait": "assets/dota2_portraits/enchantress.png"
          },
          {
            "order": 14,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png"
          },
          {
            "order": 15,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "hoodwink",
            "heroDisplay": "Hoodwink",
            "portrait": "assets/dota2_portraits/hoodwink.png"
          },
          {
            "order": 16,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "rubick",
            "heroDisplay": "Rubick",
            "portrait": "assets/dota2_portraits/rubick.png"
          },
          {
            "order": 17,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "abyssal_underlord",
            "heroDisplay": "Underlord",
            "portrait": "assets/dota2_portraits/abyssal_underlord.png"
          },
          {
            "order": 18,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "undying",
            "heroDisplay": "Undying",
            "portrait": "assets/dota2_portraits/undying.png"
          },
          {
            "order": 19,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "terrorblade",
            "heroDisplay": "Terrorblade",
            "portrait": "assets/dota2_portraits/terrorblade.png"
          },
          {
            "order": 20,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "pangolier",
            "heroDisplay": "Pangolier",
            "portrait": "assets/dota2_portraits/pangolier.png"
          },
          {
            "order": 21,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "tiny",
            "heroDisplay": "Tiny",
            "portrait": "assets/dota2_portraits/tiny.png"
          },
          {
            "order": 22,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "monkey_king",
            "heroDisplay": "Monkey King",
            "portrait": "assets/dota2_portraits/monkey_king.png"
          },
          {
            "order": 23,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png"
          },
          {
            "order": 24,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "life_stealer",
            "heroDisplay": "Lifestealer",
            "portrait": "assets/dota2_portraits/life_stealer.png"
          }
        ],
        "status": "final",
        "winner": "vision",
        "duration": "64:29",
        "durationSeconds": 3869,
        "killScore": {
          "radiant": 46,
          "dire": 48
        },
        "players": [
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "Satanic",
            "hero": "life_stealer",
            "heroDisplay": "Lifestealer",
            "portrait": "assets/dota2_portraits/life_stealer.png",
            "kills": 12,
            "deaths": 7,
            "assists": 28,
            "netWorth": 44417,
            "goldEarned": 48813,
            "gpm": 757,
            "xpm": 1016,
            "lastHits": 627,
            "heroDamage": 73414
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "No[o]ne-",
            "hero": "earth_spirit",
            "heroDisplay": "Earth Spirit",
            "portrait": "assets/dota2_portraits/earth_spirit.png",
            "kills": 10,
            "deaths": 12,
            "assists": 28,
            "netWorth": 32439,
            "goldEarned": 37851,
            "gpm": 587,
            "xpm": 815,
            "lastHits": 415,
            "heroDamage": 71951
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "Noticed",
            "hero": "abyssal_underlord",
            "heroDisplay": "Underlord",
            "portrait": "assets/dota2_portraits/abyssal_underlord.png",
            "kills": 14,
            "deaths": 6,
            "assists": 25,
            "netWorth": 36281,
            "goldEarned": 42172,
            "gpm": 654,
            "xpm": 1000,
            "lastHits": 462,
            "heroDamage": 95959
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "9Class",
            "hero": "rubick",
            "heroDisplay": "Rubick",
            "portrait": "assets/dota2_portraits/rubick.png",
            "kills": 0,
            "deaths": 13,
            "assists": 38,
            "netWorth": 17335,
            "goldEarned": 21795,
            "gpm": 338,
            "xpm": 672,
            "lastHits": 54,
            "heroDamage": 23239
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "Dukalis",
            "hero": "enchantress",
            "heroDisplay": "Enchantress",
            "portrait": "assets/dota2_portraits/enchantress.png",
            "kills": 8,
            "deaths": 10,
            "assists": 18,
            "netWorth": 20188,
            "goldEarned": 25922,
            "gpm": 402,
            "xpm": 635,
            "lastHits": 152,
            "heroDamage": 26001
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "Yatoro",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png",
            "kills": 18,
            "deaths": 4,
            "assists": 13,
            "netWorth": 33988,
            "goldEarned": 52747,
            "gpm": 818,
            "xpm": 1023,
            "lastHits": 892,
            "heroDamage": 88064
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "Larl",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png",
            "kills": 8,
            "deaths": 8,
            "assists": 28,
            "netWorth": 30018,
            "goldEarned": 34885,
            "gpm": 541,
            "xpm": 806,
            "lastHits": 472,
            "heroDamage": 27713
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "Collapse",
            "hero": "undying",
            "heroDisplay": "Undying",
            "portrait": "assets/dota2_portraits/undying.png",
            "kills": 8,
            "deaths": 10,
            "assists": 27,
            "netWorth": 29425,
            "goldEarned": 41204,
            "gpm": 639,
            "xpm": 949,
            "lastHits": 616,
            "heroDamage": 27431
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "not_me",
            "hero": "hoodwink",
            "heroDisplay": "Hoodwink",
            "portrait": "assets/dota2_portraits/hoodwink.png",
            "kills": 9,
            "deaths": 11,
            "assists": 25,
            "netWorth": 16173,
            "goldEarned": 24826,
            "gpm": 385,
            "xpm": 703,
            "lastHits": 195,
            "heroDamage": 30701
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "rue",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png",
            "kills": 5,
            "deaths": 13,
            "assists": 26,
            "netWorth": 18886,
            "goldEarned": 25535,
            "gpm": 396,
            "xpm": 635,
            "lastHits": 152,
            "heroDamage": 14233
          }
        ]
      },
      {
        "game": 3,
        "matchId": 8960762254,
        "startTimeUtc": "2026-08-23T09:14:12Z",
        "radiant": "spirit",
        "dire": "vision",
        "draft": [
          {
            "order": 1,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "bane",
            "heroDisplay": "Bane",
            "portrait": "assets/dota2_portraits/bane.png"
          },
          {
            "order": 2,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "dark_seer",
            "heroDisplay": "Dark Seer",
            "portrait": "assets/dota2_portraits/dark_seer.png"
          },
          {
            "order": 3,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "bounty_hunter",
            "heroDisplay": "Bounty Hunter",
            "portrait": "assets/dota2_portraits/bounty_hunter.png"
          },
          {
            "order": 4,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "treant",
            "heroDisplay": "Treant Protector",
            "portrait": "assets/dota2_portraits/treant.png"
          },
          {
            "order": 5,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "winter_wyvern",
            "heroDisplay": "Winter Wyvern",
            "portrait": "assets/dota2_portraits/winter_wyvern.png"
          },
          {
            "order": 6,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "earth_spirit",
            "heroDisplay": "Earth Spirit",
            "portrait": "assets/dota2_portraits/earth_spirit.png"
          },
          {
            "order": 7,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "keeper_of_the_light",
            "heroDisplay": "Keeper of the Light",
            "portrait": "assets/dota2_portraits/keeper_of_the_light.png"
          },
          {
            "order": 8,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png"
          },
          {
            "order": 9,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "furion",
            "heroDisplay": "Nature's Prophet",
            "portrait": "assets/dota2_portraits/furion.png"
          },
          {
            "order": 10,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "undying",
            "heroDisplay": "Undying",
            "portrait": "assets/dota2_portraits/undying.png"
          },
          {
            "order": 11,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "rattletrap",
            "heroDisplay": "Clockwerk",
            "portrait": "assets/dota2_portraits/rattletrap.png"
          },
          {
            "order": 12,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "abyssal_underlord",
            "heroDisplay": "Underlord",
            "portrait": "assets/dota2_portraits/abyssal_underlord.png"
          },
          {
            "order": 13,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png"
          },
          {
            "order": 14,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "enchantress",
            "heroDisplay": "Enchantress",
            "portrait": "assets/dota2_portraits/enchantress.png"
          },
          {
            "order": 15,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png"
          },
          {
            "order": 16,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "tusk",
            "heroDisplay": "Tusk",
            "portrait": "assets/dota2_portraits/tusk.png"
          },
          {
            "order": 17,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png"
          },
          {
            "order": 18,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "pangolier",
            "heroDisplay": "Pangolier",
            "portrait": "assets/dota2_portraits/pangolier.png"
          },
          {
            "order": 19,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "snapfire",
            "heroDisplay": "Snapfire",
            "portrait": "assets/dota2_portraits/snapfire.png"
          },
          {
            "order": 20,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "rubick",
            "heroDisplay": "Rubick",
            "portrait": "assets/dota2_portraits/rubick.png"
          },
          {
            "order": 21,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "vision",
            "hero": "monkey_king",
            "heroDisplay": "Monkey King",
            "portrait": "assets/dota2_portraits/monkey_king.png"
          },
          {
            "order": 22,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "windrunner",
            "heroDisplay": "Windranger",
            "portrait": "assets/dota2_portraits/windrunner.png"
          },
          {
            "order": 23,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "dire",
            "teamKey": "vision",
            "hero": "marci",
            "heroDisplay": "Marci",
            "portrait": "assets/dota2_portraits/marci.png"
          },
          {
            "order": 24,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "radiant",
            "teamKey": "spirit",
            "hero": "terrorblade",
            "heroDisplay": "Terrorblade",
            "portrait": "assets/dota2_portraits/terrorblade.png"
          }
        ],
        "status": "final",
        "winner": "spirit",
        "duration": "45:56",
        "durationSeconds": 2756,
        "killScore": {
          "radiant": 26,
          "dire": 24
        },
        "players": [
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "Yatoro",
            "hero": "terrorblade",
            "heroDisplay": "Terrorblade",
            "portrait": "assets/dota2_portraits/terrorblade.png",
            "kills": 10,
            "deaths": 1,
            "assists": 12,
            "netWorth": 43076,
            "goldEarned": 44693,
            "gpm": 973,
            "xpm": 949,
            "lastHits": 753,
            "heroDamage": 55043
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "Larl",
            "hero": "furion",
            "heroDisplay": "Nature's Prophet",
            "portrait": "assets/dota2_portraits/furion.png",
            "kills": 4,
            "deaths": 5,
            "assists": 14,
            "netWorth": 28273,
            "goldEarned": 33623,
            "gpm": 732,
            "xpm": 939,
            "lastHits": 579,
            "heroDamage": 24766
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "Collapse",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png",
            "kills": 8,
            "deaths": 3,
            "assists": 12,
            "netWorth": 22516,
            "goldEarned": 23380,
            "gpm": 509,
            "xpm": 685,
            "lastHits": 285,
            "heroDamage": 14867
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "not_me",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png",
            "kills": 2,
            "deaths": 7,
            "assists": 13,
            "netWorth": 10534,
            "goldEarned": 14377,
            "gpm": 313,
            "xpm": 453,
            "lastHits": 35,
            "heroDamage": 10630
          },
          {
            "teamKey": "spirit",
            "side": "radiant",
            "handle": "rue",
            "hero": "tusk",
            "heroDisplay": "Tusk",
            "portrait": "assets/dota2_portraits/tusk.png",
            "kills": 1,
            "deaths": 8,
            "assists": 14,
            "netWorth": 13844,
            "goldEarned": 15847,
            "gpm": 345,
            "xpm": 582,
            "lastHits": 46,
            "heroDamage": 9359
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "Satanic",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png",
            "kills": 10,
            "deaths": 3,
            "assists": 2,
            "netWorth": 32297,
            "goldEarned": 35460,
            "gpm": 772,
            "xpm": 736,
            "lastHits": 630,
            "heroDamage": 19895
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "No[o]ne-",
            "hero": "pangolier",
            "heroDisplay": "Pangolier",
            "portrait": "assets/dota2_portraits/pangolier.png",
            "kills": 4,
            "deaths": 2,
            "assists": 17,
            "netWorth": 24075,
            "goldEarned": 28800,
            "gpm": 627,
            "xpm": 899,
            "lastHits": 471,
            "heroDamage": 27725
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "Noticed",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png",
            "kills": 4,
            "deaths": 6,
            "assists": 9,
            "netWorth": 18935,
            "goldEarned": 22920,
            "gpm": 499,
            "xpm": 750,
            "lastHits": 348,
            "heroDamage": 19435
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "9Class",
            "hero": "marci",
            "heroDisplay": "Marci",
            "portrait": "assets/dota2_portraits/marci.png",
            "kills": 2,
            "deaths": 8,
            "assists": 11,
            "netWorth": 8771,
            "goldEarned": 12723,
            "gpm": 277,
            "xpm": 412,
            "lastHits": 20,
            "heroDamage": 7292
          },
          {
            "teamKey": "vision",
            "side": "dire",
            "handle": "Dukalis",
            "hero": "enchantress",
            "heroDisplay": "Enchantress",
            "portrait": "assets/dota2_portraits/enchantress.png",
            "kills": 4,
            "deaths": 7,
            "assists": 6,
            "netWorth": 11243,
            "goldEarned": 13642,
            "gpm": 297,
            "xpm": 585,
            "lastHits": 113,
            "heroDamage": 8541
          }
        ]
      },
      {
        "game": 4,
        "matchId": 8960882635,
        "startTimeUtc": "2026-08-23T10:49:41Z",
        "radiant": "vision",
        "dire": "spirit",
        "draft": [
          {
            "order": 1,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "bounty_hunter",
            "heroDisplay": "Bounty Hunter",
            "portrait": "assets/dota2_portraits/bounty_hunter.png"
          },
          {
            "order": 2,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "furion",
            "heroDisplay": "Nature's Prophet",
            "portrait": "assets/dota2_portraits/furion.png"
          },
          {
            "order": 3,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "treant",
            "heroDisplay": "Treant Protector",
            "portrait": "assets/dota2_portraits/treant.png"
          },
          {
            "order": 4,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png"
          },
          {
            "order": 5,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png"
          },
          {
            "order": 6,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "lone_druid",
            "heroDisplay": "Lone Druid",
            "portrait": "assets/dota2_portraits/lone_druid.png"
          },
          {
            "order": 7,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "earth_spirit",
            "heroDisplay": "Earth Spirit",
            "portrait": "assets/dota2_portraits/earth_spirit.png"
          },
          {
            "order": 8,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "winter_wyvern",
            "heroDisplay": "Winter Wyvern",
            "portrait": "assets/dota2_portraits/winter_wyvern.png"
          },
          {
            "order": 9,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "keeper_of_the_light",
            "heroDisplay": "Keeper of the Light",
            "portrait": "assets/dota2_portraits/keeper_of_the_light.png"
          },
          {
            "order": 10,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "ember_spirit",
            "heroDisplay": "Ember Spirit",
            "portrait": "assets/dota2_portraits/ember_spirit.png"
          },
          {
            "order": 11,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "shredder",
            "heroDisplay": "Timbersaw",
            "portrait": "assets/dota2_portraits/shredder.png"
          },
          {
            "order": 12,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "terrorblade",
            "heroDisplay": "Terrorblade",
            "portrait": "assets/dota2_portraits/terrorblade.png"
          },
          {
            "order": 13,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "doom_bringer",
            "heroDisplay": "Doom",
            "portrait": "assets/dota2_portraits/doom_bringer.png"
          },
          {
            "order": 14,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "centaur",
            "heroDisplay": "Centaur Warrunner",
            "portrait": "assets/dota2_portraits/centaur.png"
          },
          {
            "order": 15,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "rattletrap",
            "heroDisplay": "Clockwerk",
            "portrait": "assets/dota2_portraits/rattletrap.png"
          },
          {
            "order": 16,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "life_stealer",
            "heroDisplay": "Lifestealer",
            "portrait": "assets/dota2_portraits/life_stealer.png"
          },
          {
            "order": 17,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "mirana",
            "heroDisplay": "Mirana",
            "portrait": "assets/dota2_portraits/mirana.png"
          },
          {
            "order": 18,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "templar_assassin",
            "heroDisplay": "Templar Assassin",
            "portrait": "assets/dota2_portraits/templar_assassin.png"
          },
          {
            "order": 19,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "snapfire",
            "heroDisplay": "Snapfire",
            "portrait": "assets/dota2_portraits/snapfire.png"
          },
          {
            "order": 20,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png"
          },
          {
            "order": 21,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "puck",
            "heroDisplay": "Puck",
            "portrait": "assets/dota2_portraits/puck.png"
          },
          {
            "order": 22,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "invoker",
            "heroDisplay": "Invoker",
            "portrait": "assets/dota2_portraits/invoker.png"
          },
          {
            "order": 23,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "storm_spirit",
            "heroDisplay": "Storm Spirit",
            "portrait": "assets/dota2_portraits/storm_spirit.png"
          },
          {
            "order": 24,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "sand_king",
            "heroDisplay": "Sand King",
            "portrait": "assets/dota2_portraits/sand_king.png"
          }
        ],
        "status": "final",
        "winner": "vision",
        "duration": "44:18",
        "durationSeconds": 2658,
        "killScore": {
          "radiant": 31,
          "dire": 13
        },
        "players": [
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "Satanic",
            "hero": "life_stealer",
            "heroDisplay": "Lifestealer",
            "portrait": "assets/dota2_portraits/life_stealer.png",
            "kills": 6,
            "deaths": 1,
            "assists": 11,
            "netWorth": 32156,
            "goldEarned": 33579,
            "gpm": 758,
            "xpm": 865,
            "lastHits": 545,
            "heroDamage": 29001
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "No[o]ne-",
            "hero": "sand_king",
            "heroDisplay": "Sand King",
            "portrait": "assets/dota2_portraits/sand_king.png",
            "kills": 5,
            "deaths": 3,
            "assists": 15,
            "netWorth": 24152,
            "goldEarned": 25738,
            "gpm": 581,
            "xpm": 720,
            "lastHits": 395,
            "heroDamage": 27649
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "Noticed",
            "hero": "doom_bringer",
            "heroDisplay": "Doom",
            "portrait": "assets/dota2_portraits/doom_bringer.png",
            "kills": 9,
            "deaths": 1,
            "assists": 11,
            "netWorth": 27932,
            "goldEarned": 29238,
            "gpm": 660,
            "xpm": 878,
            "lastHits": 330,
            "heroDamage": 27165
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "9Class",
            "hero": "keeper_of_the_light",
            "heroDisplay": "Keeper of the Light",
            "portrait": "assets/dota2_portraits/keeper_of_the_light.png",
            "kills": 3,
            "deaths": 4,
            "assists": 20,
            "netWorth": 17615,
            "goldEarned": 20422,
            "gpm": 461,
            "xpm": 586,
            "lastHits": 170,
            "heroDamage": 11913
          },
          {
            "teamKey": "vision",
            "side": "radiant",
            "handle": "Dukalis",
            "hero": "mirana",
            "heroDisplay": "Mirana",
            "portrait": "assets/dota2_portraits/mirana.png",
            "kills": 8,
            "deaths": 4,
            "assists": 19,
            "netWorth": 12184,
            "goldEarned": 16125,
            "gpm": 364,
            "xpm": 535,
            "lastHits": 95,
            "heroDamage": 20713
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "Yatoro",
            "hero": "templar_assassin",
            "heroDisplay": "Templar Assassin",
            "portrait": "assets/dota2_portraits/templar_assassin.png",
            "kills": 3,
            "deaths": 4,
            "assists": 6,
            "netWorth": 27383,
            "goldEarned": 32693,
            "gpm": 738,
            "xpm": 866,
            "lastHits": 657,
            "heroDamage": 27760
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "Larl",
            "hero": "storm_spirit",
            "heroDisplay": "Storm Spirit",
            "portrait": "assets/dota2_portraits/storm_spirit.png",
            "kills": 6,
            "deaths": 3,
            "assists": 5,
            "netWorth": 19478,
            "goldEarned": 22814,
            "gpm": 515,
            "xpm": 592,
            "lastHits": 374,
            "heroDamage": 21054
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "Collapse",
            "hero": "centaur",
            "heroDisplay": "Centaur Warrunner",
            "portrait": "assets/dota2_portraits/centaur.png",
            "kills": 1,
            "deaths": 3,
            "assists": 7,
            "netWorth": 22118,
            "goldEarned": 23744,
            "gpm": 536,
            "xpm": 619,
            "lastHits": 356,
            "heroDamage": 13708
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "not_me",
            "hero": "rattletrap",
            "heroDisplay": "Clockwerk",
            "portrait": "assets/dota2_portraits/rattletrap.png",
            "kills": 1,
            "deaths": 14,
            "assists": 7,
            "netWorth": 7240,
            "goldEarned": 10277,
            "gpm": 232,
            "xpm": 280,
            "lastHits": 20,
            "heroDamage": 19068
          },
          {
            "teamKey": "spirit",
            "side": "dire",
            "handle": "rue",
            "hero": "winter_wyvern",
            "heroDisplay": "Winter Wyvern",
            "portrait": "assets/dota2_portraits/winter_wyvern.png",
            "kills": 1,
            "deaths": 7,
            "assists": 8,
            "netWorth": 11607,
            "goldEarned": 12625,
            "gpm": 285,
            "xpm": 452,
            "lastHits": 30,
            "heroDamage": 14198
          }
        ]
      },
      {
        "game": 5,
        "matchId": 8960991322,
        "startTimeUtc": "2026-08-23T12:08:38Z",
        "radiant": "vision",
        "dire": "spirit",
        "draft": [
          {
            "order": 1,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "bounty_hunter",
            "heroDisplay": "Bounty Hunter",
            "portrait": "assets/dota2_portraits/bounty_hunter.png"
          },
          {
            "order": 2,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "furion",
            "heroDisplay": "Nature's Prophet",
            "portrait": "assets/dota2_portraits/furion.png"
          },
          {
            "order": 3,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "treant",
            "heroDisplay": "Treant Protector",
            "portrait": "assets/dota2_portraits/treant.png"
          },
          {
            "order": 4,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "nevermore",
            "heroDisplay": "Shadow Fiend",
            "portrait": "assets/dota2_portraits/nevermore.png"
          },
          {
            "order": 5,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "doom_bringer",
            "heroDisplay": "Doom",
            "portrait": "assets/dota2_portraits/doom_bringer.png"
          },
          {
            "order": 6,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "lone_druid",
            "heroDisplay": "Lone Druid",
            "portrait": "assets/dota2_portraits/lone_druid.png"
          },
          {
            "order": 7,
            "phase": "Ban Phase 1",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "earth_spirit",
            "heroDisplay": "Earth Spirit",
            "portrait": "assets/dota2_portraits/earth_spirit.png"
          },
          {
            "order": 8,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "bane",
            "heroDisplay": "Bane",
            "portrait": "assets/dota2_portraits/bane.png"
          },
          {
            "order": 9,
            "phase": "Pick Phase 1",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "invoker",
            "heroDisplay": "Invoker",
            "portrait": "assets/dota2_portraits/invoker.png"
          },
          {
            "order": 10,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "winter_wyvern",
            "heroDisplay": "Winter Wyvern",
            "portrait": "assets/dota2_portraits/winter_wyvern.png"
          },
          {
            "order": 11,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "dark_willow",
            "heroDisplay": "Dark Willow",
            "portrait": "assets/dota2_portraits/dark_willow.png"
          },
          {
            "order": 12,
            "phase": "Ban Phase 2",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "slardar",
            "heroDisplay": "Slardar",
            "portrait": "assets/dota2_portraits/slardar.png"
          },
          {
            "order": 13,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "rubick",
            "heroDisplay": "Rubick",
            "portrait": "assets/dota2_portraits/rubick.png"
          },
          {
            "order": 14,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "pangolier",
            "heroDisplay": "Pangolier",
            "portrait": "assets/dota2_portraits/pangolier.png"
          },
          {
            "order": 15,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "mirana",
            "heroDisplay": "Mirana",
            "portrait": "assets/dota2_portraits/mirana.png"
          },
          {
            "order": 16,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "axe",
            "heroDisplay": "Axe",
            "portrait": "assets/dota2_portraits/axe.png"
          },
          {
            "order": 17,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "hoodwink",
            "heroDisplay": "Hoodwink",
            "portrait": "assets/dota2_portraits/hoodwink.png"
          },
          {
            "order": 18,
            "phase": "Pick Phase 2",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "life_stealer",
            "heroDisplay": "Lifestealer",
            "portrait": "assets/dota2_portraits/life_stealer.png"
          },
          {
            "order": 19,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "faceless_void",
            "heroDisplay": "Faceless Void",
            "portrait": "assets/dota2_portraits/faceless_void.png"
          },
          {
            "order": 20,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "centaur",
            "heroDisplay": "Centaur Warrunner",
            "portrait": "assets/dota2_portraits/centaur.png"
          },
          {
            "order": 21,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "terrorblade",
            "heroDisplay": "Terrorblade",
            "portrait": "assets/dota2_portraits/terrorblade.png"
          },
          {
            "order": 22,
            "phase": "Ban Phase 3",
            "type": "ban",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "puck",
            "heroDisplay": "Puck",
            "portrait": "assets/dota2_portraits/puck.png"
          },
          {
            "order": 23,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "dire",
            "teamKey": "spirit",
            "hero": "dark_seer",
            "heroDisplay": "Dark Seer",
            "portrait": "assets/dota2_portraits/dark_seer.png"
          },
          {
            "order": 24,
            "phase": "Pick Phase 3",
            "type": "pick",
            "team": "radiant",
            "teamKey": "vision",
            "hero": "juggernaut",
            "heroDisplay": "Juggernaut",
            "portrait": "assets/dota2_portraits/juggernaut.png"
          }
        ],
        "status": "live",
        "isDecider": true,
        "winner": null,
        "duration": null,
        "durationSeconds": null,
        "killScore": null,
        "players": null,
        "lineups": {
          "radiant": [
            {
              "handle": "Satanic",
              "teamKey": "vision",
              "hero": "juggernaut",
              "heroDisplay": "Juggernaut",
              "portrait": "assets/dota2_portraits/juggernaut.png"
            },
            {
              "handle": "No[o]ne-",
              "teamKey": "vision",
              "hero": "invoker",
              "heroDisplay": "Invoker",
              "portrait": "assets/dota2_portraits/invoker.png"
            },
            {
              "handle": "Noticed",
              "teamKey": "vision",
              "hero": "axe",
              "heroDisplay": "Axe",
              "portrait": "assets/dota2_portraits/axe.png"
            },
            {
              "handle": "9Class",
              "teamKey": "vision",
              "hero": "rubick",
              "heroDisplay": "Rubick",
              "portrait": "assets/dota2_portraits/rubick.png"
            },
            {
              "handle": "Dukalis",
              "teamKey": "vision",
              "hero": "hoodwink",
              "heroDisplay": "Hoodwink",
              "portrait": "assets/dota2_portraits/hoodwink.png"
            }
          ],
          "dire": [
            {
              "handle": "Yatoro",
              "teamKey": "spirit",
              "hero": "life_stealer",
              "heroDisplay": "Lifestealer",
              "portrait": "assets/dota2_portraits/life_stealer.png"
            },
            {
              "handle": "Larl",
              "teamKey": "spirit",
              "hero": "pangolier",
              "heroDisplay": "Pangolier",
              "portrait": "assets/dota2_portraits/pangolier.png"
            },
            {
              "handle": "Collapse",
              "teamKey": "spirit",
              "hero": "dark_seer",
              "heroDisplay": "Dark Seer",
              "portrait": "assets/dota2_portraits/dark_seer.png"
            },
            {
              "handle": "not_me",
              "teamKey": "spirit",
              "hero": "mirana",
              "heroDisplay": "Mirana",
              "portrait": "assets/dota2_portraits/mirana.png"
            },
            {
              "handle": "rue",
              "teamKey": "spirit",
              "hero": "bane",
              "heroDisplay": "Bane",
              "portrait": "assets/dota2_portraits/bane.png"
            }
          ]
        }
      }
    ]
  },
  "heroMeta": {
    "source": "OpenDota SQL over league 19719, 147 matches. rdy.gg and dota2protips report 148 games, so counts differ by one or two.",
    "totalMatches": 147,
    "heroesPicked": 110,
    "heroesUnpicked": 23,
    "heroPoolSize": 127,
    "mostPicked": [
      {
        "hero": "mirana",
        "heroDisplay": "Mirana",
        "portrait": "assets/dota2_portraits/mirana.png",
        "picks": 73,
        "winPct": 47
      },
      {
        "hero": "hoodwink",
        "heroDisplay": "Hoodwink",
        "portrait": "assets/dota2_portraits/hoodwink.png",
        "picks": 72,
        "winPct": 42
      },
      {
        "hero": "centaur",
        "heroDisplay": "Centaur Warrunner",
        "portrait": "assets/dota2_portraits/centaur.png",
        "picks": 58,
        "winPct": 50
      },
      {
        "hero": "winter_wyvern",
        "heroDisplay": "Winter Wyvern",
        "portrait": "assets/dota2_portraits/winter_wyvern.png",
        "picks": 50,
        "winPct": 58
      },
      {
        "hero": "undying",
        "heroDisplay": "Undying",
        "portrait": "assets/dota2_portraits/undying.png",
        "picks": 49,
        "winPct": 45
      },
      {
        "hero": "lina",
        "heroDisplay": "Lina",
        "portrait": "assets/dota2_portraits/lina.png",
        "picks": 45,
        "winPct": 49
      },
      {
        "hero": "dark_willow",
        "heroDisplay": "Dark Willow",
        "portrait": "assets/dota2_portraits/dark_willow.png",
        "picks": 44,
        "winPct": 57
      },
      {
        "hero": "earth_spirit",
        "heroDisplay": "Earth Spirit",
        "portrait": "assets/dota2_portraits/earth_spirit.png",
        "picks": 44,
        "winPct": 66
      },
      {
        "hero": "ember_spirit",
        "heroDisplay": "Ember Spirit",
        "portrait": "assets/dota2_portraits/ember_spirit.png",
        "picks": 39,
        "winPct": 54
      },
      {
        "hero": "windrunner",
        "heroDisplay": "Windranger",
        "portrait": "assets/dota2_portraits/windrunner.png",
        "picks": 37,
        "winPct": 51
      }
    ],
    "mostBanned": [
      {
        "hero": "treant",
        "heroDisplay": "Treant Protector",
        "portrait": "assets/dota2_portraits/treant.png",
        "bans": 139,
        "picks": 8,
        "pickWinPct": 87.5
      },
      {
        "hero": "keeper_of_the_light",
        "heroDisplay": "Keeper of the Light",
        "portrait": "assets/dota2_portraits/keeper_of_the_light.png",
        "bans": 98,
        "picks": 23,
        "pickWinPct": 57
      },
      {
        "hero": "earth_spirit",
        "heroDisplay": "Earth Spirit",
        "portrait": "assets/dota2_portraits/earth_spirit.png",
        "bans": 92,
        "picks": 44,
        "pickWinPct": 66
      },
      {
        "hero": "nevermore",
        "heroDisplay": "Shadow Fiend",
        "portrait": "assets/dota2_portraits/nevermore.png",
        "bans": 77,
        "picks": 32,
        "pickWinPct": 56
      },
      {
        "hero": "lina",
        "heroDisplay": "Lina",
        "portrait": "assets/dota2_portraits/lina.png",
        "bans": 74,
        "picks": 45,
        "pickWinPct": 49
      },
      {
        "hero": "largo",
        "heroDisplay": "Largo",
        "portrait": "assets/dota2_portraits/largo.png",
        "bans": 74,
        "picks": 18,
        "pickWinPct": null
      },
      {
        "hero": "ember_spirit",
        "heroDisplay": "Ember Spirit",
        "portrait": "assets/dota2_portraits/ember_spirit.png",
        "bans": 67,
        "picks": 39,
        "pickWinPct": 54
      },
      {
        "hero": "lone_druid",
        "heroDisplay": "Lone Druid",
        "portrait": "assets/dota2_portraits/lone_druid.png",
        "bans": 65,
        "picks": 17,
        "pickWinPct": 41
      },
      {
        "hero": "invoker",
        "heroDisplay": "Invoker",
        "portrait": "assets/dota2_portraits/invoker.png",
        "bans": 63,
        "picks": 24,
        "pickWinPct": 38
      },
      {
        "hero": "puck",
        "heroDisplay": "Puck",
        "portrait": "assets/dota2_portraits/puck.png",
        "bans": 61,
        "picks": 19,
        "pickWinPct": null
      }
    ],
    "mostContested": [
      {
        "hero": "treant",
        "heroDisplay": "Treant Protector",
        "portrait": "assets/dota2_portraits/treant.png",
        "bans": 139,
        "picks": 8,
        "contested": 147,
        "contestPct": 100.0
      },
      {
        "hero": "earth_spirit",
        "heroDisplay": "Earth Spirit",
        "portrait": "assets/dota2_portraits/earth_spirit.png",
        "bans": 92,
        "picks": 44,
        "contested": 136,
        "contestPct": 92.5
      },
      {
        "hero": "keeper_of_the_light",
        "heroDisplay": "Keeper of the Light",
        "portrait": "assets/dota2_portraits/keeper_of_the_light.png",
        "bans": 98,
        "picks": 23,
        "contested": 121,
        "contestPct": 82.3
      },
      {
        "hero": "lina",
        "heroDisplay": "Lina",
        "portrait": "assets/dota2_portraits/lina.png",
        "bans": 74,
        "picks": 45,
        "contested": 119,
        "contestPct": 81.0
      },
      {
        "hero": "nevermore",
        "heroDisplay": "Shadow Fiend",
        "portrait": "assets/dota2_portraits/nevermore.png",
        "bans": 77,
        "picks": 32,
        "contested": 109,
        "contestPct": 74.1
      },
      {
        "hero": "ember_spirit",
        "heroDisplay": "Ember Spirit",
        "portrait": "assets/dota2_portraits/ember_spirit.png",
        "bans": 67,
        "picks": 39,
        "contested": 106,
        "contestPct": 72.1
      },
      {
        "hero": "largo",
        "heroDisplay": "Largo",
        "portrait": "assets/dota2_portraits/largo.png",
        "bans": 74,
        "picks": 18,
        "contested": 92,
        "contestPct": 62.6
      },
      {
        "hero": "invoker",
        "heroDisplay": "Invoker",
        "portrait": "assets/dota2_portraits/invoker.png",
        "bans": 63,
        "picks": 24,
        "contested": 87,
        "contestPct": 59.2
      },
      {
        "hero": "lone_druid",
        "heroDisplay": "Lone Druid",
        "portrait": "assets/dota2_portraits/lone_druid.png",
        "bans": 65,
        "picks": 17,
        "contested": 82,
        "contestPct": 55.8
      },
      {
        "hero": "puck",
        "heroDisplay": "Puck",
        "portrait": "assets/dota2_portraits/puck.png",
        "bans": 61,
        "picks": 19,
        "contested": 80,
        "contestPct": 54.4
      }
    ],
    "bestWinrate": [
      {
        "hero": "pangolier",
        "heroDisplay": "Pangolier",
        "portrait": "assets/dota2_portraits/pangolier.png",
        "picks": 28,
        "winPct": 68
      },
      {
        "hero": "earth_spirit",
        "heroDisplay": "Earth Spirit",
        "portrait": "assets/dota2_portraits/earth_spirit.png",
        "picks": 44,
        "winPct": 66
      },
      {
        "hero": "kez",
        "heroDisplay": "Kez",
        "portrait": "assets/dota2_portraits/kez.png",
        "picks": 27,
        "winPct": 63
      },
      {
        "hero": "furion",
        "heroDisplay": "Nature's Prophet",
        "portrait": "assets/dota2_portraits/furion.png",
        "picks": 25,
        "winPct": 60
      },
      {
        "hero": "necrolyte",
        "heroDisplay": "Necrophos",
        "portrait": "assets/dota2_portraits/necrolyte.png",
        "picks": 27,
        "winPct": 59
      },
      {
        "hero": "winter_wyvern",
        "heroDisplay": "Winter Wyvern",
        "portrait": "assets/dota2_portraits/winter_wyvern.png",
        "picks": 50,
        "winPct": 58
      }
    ],
    "records": {
      "longestGame": {
        "duration": "94:38",
        "teams": "TEAM VISION vs Team Falcons",
        "date": "2026-08-13",
        "killScore": "56-39",
        "phase": "Group Stage"
      },
      "secondLongestGame": {
        "duration": "77:27",
        "teams": "BoomBoys vs TEAM VISION",
        "date": "2026-08-20",
        "killScore": "31-25",
        "phase": "Upper Bracket Round 1"
      },
      "shortestGame": {
        "duration": "18:22",
        "teams": "Team Yandex vs Team Resilience",
        "date": "2026-08-15",
        "killScore": "21-5",
        "phase": "Group Stage"
      },
      "highestGpm": {
        "handle": "Yatoro",
        "hero": "Nature's Prophet",
        "gpm": 1121,
        "matchId": 8958478716,
        "durationMinutes": 49
      },
      "mostKillsInGame": {
        "handle": "Yatoro",
        "hero": "Kez",
        "kills": 31,
        "matchId": 8944680063,
        "note": "Verified at 31 kills, match 8944680063. The claim that it ties SumaiL's all-time TI record on Tiny is press-sourced and unverified."
      },
      "secondMostKillsInGame": {
        "handle": "Satanic",
        "hero": "Shadow Fiend",
        "kills": 29,
        "matchId": 8943477775
      },
      "biggestHeroPool": {
        "handles": [
          "Larl",
          "watson",
          "CHIRA_JUNIOR"
        ],
        "heroes": 13,
        "note": "Three-way tie at 13 distinct heroes, not Larl alone."
      },
      "longestAverageWinningDuration": {
        "team": "Nigma Galaxy",
        "duration": "55:36"
      }
    },
    "unpickedNote": "23 of the 127 heroes in OpenDota's hero list were never picked (104 were). Previously stated as 22."
  },
  "storylines": [
    {
      "id": "three-aegis",
      "headline": "Spirit are playing for a third Aegis",
      "fact": "Team Spirit became the first organisation to win three Aegis of Champions (2021, 2023, 2026). Yatoro and Collapse became the first players ever to win three Internationals, across six TI appearances.",
      "tags": [
        "spirit",
        "history",
        "record"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": "No organisation has ever won three Internationals. Yatoro and Collapse would be the first players to do it, across six TI appearances."
    },
    {
      "id": "miposhka-coach",
      "headline": "Miposhka retired, then came back as coach",
      "fact": "Miposhka won TI as a coach after two as a player, only the second person to win The International as both player and coach, after Aui_2000. He had retired from the roster after TI 2025 and came back as coach for the TI 2026 qualifier.",
      "tags": [
        "spirit",
        "coach",
        "history"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": "Miposhka left the Spirit roster after TI 2025 and returned as coach for the TI 2026 qualifier. Only Aui_2000 has won The International as both player and coach."
    },
    {
      "id": "spirit-route",
      "headline": "Spirit took the long road to the final",
      "fact": "Spirit had no direct invite. They qualified through the merged European qualifier, went 3-2 in the Swiss stage, survived the Elimination Round, lost the upper bracket semifinal to TEAM VISION, and won the title from the lower bracket, beating Liquid 2-0, BoomBoys 2-0 and Yandex 2-0 without dropping a map before the final.",
      "tags": [
        "spirit",
        "bracket",
        "run"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": "No direct invite, the merged European qualifier, 3-2 in the Swiss, the Elimination Round, a lost upper bracket semifinal to VISION, then Liquid 2-0, BoomBoys 2-0 and Yandex 2-0 without dropping a map."
    },
    {
      "id": "vision-7-0",
      "headline": "VISION came into the final 7-0 in series",
      "fact": "TEAM VISION went 7-0 in series before the grand final, including two wins over Spirit at the event, and lost the only series that mattered. No[o]ne- is still without an Aegis after entering the pro scene in 2014.",
      "tags": [
        "vision",
        "run",
        "record"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": "VISION have not lost a series at this event and beat Spirit twice on the way. No[o]ne- turned pro in 2014 and has never held the Aegis."
    },
    {
      "id": "treant-ban",
      "headline": "Treant Protector is the most banned hero in TI history",
      "fact": "Treant Protector was banned in 139 of the 147 recorded games, a 94.6% ban rate and a 100% contest rate. In the Main Event he was banned in every one of the 38 games OpenDota records and never picked. On the eight occasions he slipped through he won seven, 87.5%.",
      "tags": [
        "meta",
        "draft",
        "record"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "fifth-five-gamer",
      "headline": "Only the fifth TI grand final to reach a game five",
      "fact": "Only the fifth TI grand final ever to go the full five games, and the most-watched moment of the event at 1,796,267 concurrent viewers.",
      "tags": [
        "grand-final",
        "history",
        "viewership"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "falcons-out",
      "headline": "The defending champions went out in the quarterfinals",
      "fact": "Defending champions Team Falcons went out in 7th to 8th, losing 2-1 to Team Liquid. Two weeks later, on 6 September, Falcons announced their exit from Dota 2 citing long-term sustainability. Aui_2000 missed a fourth title, and skiter and Sneyking missed becoming the first three-time Aegis winners.",
      "tags": [
        "falcons",
        "bracket",
        "upset"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": "Falcons finished 7th to 8th after losing 2-1 to Team Liquid. Aui_2000 misses a fourth title, skiter and Sneyking miss a third Aegis."
    },
    {
      "id": "lgd-topson",
      "headline": "LGD reached TI through South America, with Topson",
      "fact": "LGD Gaming reached TI through the South America qualifier with a South American roster and had to replace prodigy TaiLung, who received a lifetime ban for match-fixing before the event, with two-time TI champion Topson.",
      "tags": [
        "lgd",
        "roster",
        "qualifier"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "sumail-retires",
      "headline": "SumaiL called it a career after Nigma went out",
      "fact": "SumaiL announced his retirement after Nigma Galaxy were eliminated 1-2 by BoomBoys in the lower bracket quarterfinal on 22 August, finishing 5th to 6th. He had already said before the event that TI 2026 was probably his last. Yatoro's 31 kills on Kez at this TI are reported to tie the all-time single-game TI kill record SumaiL set on Tiny; the record claim is unverified.",
      "tags": [
        "nigma",
        "retirement",
        "record"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "hero-meta",
      "headline": "Earth Spirit was the best hero at the event",
      "fact": "Earth Spirit was the event's best hero at 44 picks, a 65.9% win rate and a 92.5% contest rate. Mirana was the most-picked hero at 73 picks and 46.6%, one ahead of Hoodwink on 72 at 41.7%. 23 heroes went entirely unpicked.",
      "tags": [
        "meta",
        "statistics"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "yatoro-gpm",
      "headline": "Yatoro set the tournament GPM record",
      "fact": "Yatoro set the tournament GPM record at 1,121 on Nature's Prophet (match 8958478716, 49:34). Larl used 13 different heroes, the joint-largest pool at the event, tied with watson and CHIRA_JUNIOR of Team Yandex.",
      "tags": [
        "spirit",
        "record",
        "statistics"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "game-length",
      "headline": "From 18 minutes to 94, the spread was enormous",
      "fact": "Game length spread ran from 18:22 (Team Yandex vs Team Resilience) to 94:38 (TEAM VISION vs Team Falcons, opening day). Roughly half of all games passed 45 minutes.",
      "tags": [
        "statistics",
        "records"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "vp-disband",
      "headline": "Virtus.pro disbanded their Dota 2 roster",
      "fact": "Virtus.pro disbanded their Dota 2 roster the day after the final, on 24 August.",
      "tags": [
        "scene",
        "roster"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": null
    },
    {
      "id": "prize-pool",
      "headline": "The biggest pool since the Battle Pass was dropped",
      "fact": "The prize pool was built without a Battle Pass or Compendium, from a 1.6M Valve base plus team bundle and talent sticker capsule sales. Largest TI pool since the Battle Pass was dropped.",
      "tags": [
        "prize-pool",
        "business"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    },
    {
      "id": "puppey-coach",
      "headline": "Puppey is back in a TI grand final, on the bench",
      "fact": "TEAM VISION were coached by Clement 'Puppey' Ivanov. He won the first-ever TI in 2011 with Natus Vincere, was runner-up in 2012, 2013 and 2022 as a player, and lost his first TI grand final as a coach here.",
      "tags": [
        "vision",
        "coach",
        "history"
      ],
      "safeBeforeDecider": false,
      "preDeciderAngle": "Puppey won the first International in 2011 with Natus Vincere and was runner-up in 2012, 2013 and 2022 as a player. This is his first TI grand final as a coach."
    },
    {
      "id": "noticed-doom",
      "headline": "Noticed has not lost on Doom at this TI",
      "fact": "Noticed kept a perfect record on Doom at TI 2026: five games, five wins. Verified against OpenDota (matches 8943098449, 8946428867, 8957180942, 8957364447, 8960882635).",
      "tags": [
        "vision",
        "draft",
        "statistics"
      ],
      "safeBeforeDecider": true,
      "preDeciderAngle": null
    }
  ],
  "heroIndex": {
    "Abaddon": "abaddon",
    "Alchemist": "alchemist",
    "Ancient Apparition": "ancient_apparition",
    "Anti-Mage": "antimage",
    "Arc Warden": "arc_warden",
    "Axe": "axe",
    "Bane": "bane",
    "Batrider": "batrider",
    "Beastmaster": "beastmaster",
    "Bloodseeker": "bloodseeker",
    "Bounty Hunter": "bounty_hunter",
    "Brewmaster": "brewmaster",
    "Bristleback": "bristleback",
    "Broodmother": "broodmother",
    "Centaur Warrunner": "centaur",
    "Chaos Knight": "chaos_knight",
    "Chen": "chen",
    "Clinkz": "clinkz",
    "Clockwerk": "rattletrap",
    "Crystal Maiden": "crystal_maiden",
    "Dark Seer": "dark_seer",
    "Dark Willow": "dark_willow",
    "Dawnbreaker": "dawnbreaker",
    "Dazzle": "dazzle",
    "Death Prophet": "death_prophet",
    "Disruptor": "disruptor",
    "Doom": "doom_bringer",
    "Dragon Knight": "dragon_knight",
    "Drow Ranger": "drow_ranger",
    "Earth Spirit": "earth_spirit",
    "Earthshaker": "earthshaker",
    "Elder Titan": "elder_titan",
    "Ember Spirit": "ember_spirit",
    "Enchantress": "enchantress",
    "Enigma": "enigma",
    "Faceless Void": "faceless_void",
    "Grimstroke": "grimstroke",
    "Gyrocopter": "gyrocopter",
    "Hoodwink": "hoodwink",
    "Huskar": "huskar",
    "Invoker": "invoker",
    "Io": "wisp",
    "Jakiro": "jakiro",
    "Juggernaut": "juggernaut",
    "Keeper of the Light": "keeper_of_the_light",
    "Kez": "kez",
    "Kunkka": "kunkka",
    "Largo": "largo",
    "Legion Commander": "legion_commander",
    "Leshrac": "leshrac",
    "Lich": "lich",
    "Lifestealer": "life_stealer",
    "Lina": "lina",
    "Lion": "lion",
    "Lone Druid": "lone_druid",
    "Luna": "luna",
    "Lycan": "lycan",
    "Magnus": "magnataur",
    "Marci": "marci",
    "Mars": "mars",
    "Medusa": "medusa",
    "Meepo": "meepo",
    "Mirana": "mirana",
    "Monkey King": "monkey_king",
    "Morphling": "morphling",
    "Muerta": "muerta",
    "Naga Siren": "naga_siren",
    "Nature's Prophet": "furion",
    "Necrophos": "necrolyte",
    "Night Stalker": "night_stalker",
    "Nyx Assassin": "nyx_assassin",
    "Ogre Magi": "ogre_magi",
    "Omniknight": "omniknight",
    "Oracle": "oracle",
    "Outworld Devourer": "obsidian_destroyer",
    "Pangolier": "pangolier",
    "Phantom Assassin": "phantom_assassin",
    "Phantom Lancer": "phantom_lancer",
    "Phoenix": "phoenix",
    "Primal Beast": "primal_beast",
    "Puck": "puck",
    "Pudge": "pudge",
    "Pugna": "pugna",
    "Queen of Pain": "queenofpain",
    "Razor": "razor",
    "Riki": "riki",
    "Ring Master": "ringmaster",
    "Rubick": "rubick",
    "Sand King": "sand_king",
    "Shadow Demon": "shadow_demon",
    "Shadow Fiend": "nevermore",
    "Shadow Shaman": "shadow_shaman",
    "Silencer": "silencer",
    "Skywrath Mage": "skywrath_mage",
    "Slardar": "slardar",
    "Slark": "slark",
    "Snapfire": "snapfire",
    "Sniper": "sniper",
    "Spectre": "spectre",
    "Spirit Breaker": "spirit_breaker",
    "Storm Spirit": "storm_spirit",
    "Sven": "sven",
    "Techies": "techies",
    "Templar Assassin": "templar_assassin",
    "Terrorblade": "terrorblade",
    "Tidehunter": "tidehunter",
    "Timbersaw": "shredder",
    "Tinker": "tinker",
    "Tiny": "tiny",
    "Treant Protector": "treant",
    "Troll Warlord": "troll_warlord",
    "Tusk": "tusk",
    "Underlord": "abyssal_underlord",
    "Undying": "undying",
    "Ursa": "ursa",
    "Vengeful Spirit": "vengefulspirit",
    "Venomancer": "venomancer",
    "Viper": "viper",
    "Visage": "visage",
    "Void Spirit": "void_spirit",
    "Warlock": "warlock",
    "Weaver": "weaver",
    "Windranger": "windrunner",
    "Winter Wyvern": "winter_wyvern",
    "Witch Doctor": "witch_doctor",
    "Wraith King": "skeleton_king",
    "Zeus": "zuus"
  },
  "portraits": {
    "base": "assets/dota2_portraits/",
    "ext": ".png",
    "existing": [
      "abaddon",
      "abyssal_underlord",
      "alchemist",
      "ancient_apparition",
      "antimage",
      "arc_warden",
      "axe",
      "bane",
      "batrider",
      "beastmaster",
      "bloodseeker",
      "bounty_hunter",
      "brewmaster",
      "bristleback",
      "broodmother",
      "centaur",
      "chaos_knight",
      "chen",
      "clinkz",
      "crystal_maiden",
      "dark_seer",
      "dark_willow",
      "dawnbreaker",
      "dazzle",
      "death_prophet",
      "disruptor",
      "doom_bringer",
      "dragon_knight",
      "drow_ranger",
      "earth_spirit",
      "earthshaker",
      "elder_titan",
      "ember_spirit",
      "enchantress",
      "enigma",
      "faceless_void",
      "furion",
      "grimstroke",
      "gyrocopter",
      "hoodwink",
      "huskar",
      "invoker",
      "jakiro",
      "juggernaut",
      "keeper_of_the_light",
      "kez",
      "kunkka",
      "largo",
      "legion_commander",
      "leshrac",
      "lich",
      "life_stealer",
      "lina",
      "lion",
      "lone_druid",
      "luna",
      "lycan",
      "magnataur",
      "marci",
      "mars",
      "medusa",
      "meepo",
      "mirana",
      "monkey_king",
      "morphling",
      "muerta",
      "naga_siren",
      "necrolyte",
      "nevermore",
      "night_stalker",
      "nyx_assassin",
      "obsidian_destroyer",
      "ogre_magi",
      "omniknight",
      "oracle",
      "pangolier",
      "phantom_assassin",
      "phantom_lancer",
      "phoenix",
      "primal_beast",
      "puck",
      "pudge",
      "pugna",
      "queenofpain",
      "rattletrap",
      "razor",
      "riki",
      "ringmaster",
      "rubick",
      "sand_king",
      "shadow_demon",
      "shadow_shaman",
      "shredder",
      "silencer",
      "skeleton_king",
      "skywrath_mage",
      "slardar",
      "slark",
      "snapfire",
      "sniper",
      "spectre",
      "spirit_breaker",
      "storm_spirit",
      "sven",
      "techies",
      "templar_assassin",
      "terrorblade",
      "tidehunter",
      "tinker",
      "tiny",
      "treant",
      "troll_warlord",
      "tusk",
      "undying",
      "ursa",
      "vengefulspirit",
      "venomancer",
      "viper",
      "visage",
      "void_spirit",
      "warlock",
      "weaver",
      "windrunner",
      "winter_wyvern",
      "wisp",
      "witch_doctor",
      "zuus"
    ]
  },
  "items": {
    "base": "assets/dota2_items/",
    "ext": ".png",
    "existing": [
      "abyssal_blade",
      "aegis",
      "aeon_disk",
      "aether_lens",
      "aetherial_halo",
      "aghanims_shard",
      "aghanims_shard_roshan",
      "ancient_guardian",
      "ancient_janggo",
      "ancient_perseverance",
      "angels_demise",
      "apex",
      "arcane_blink",
      "arcane_boots",
      "arcane_ring",
      "arcane_scout",
      "armlet",
      "ascetic_cap",
      "ash_legion_shield",
      "assassins_dagger",
      "assault",
      "avianas_feather",
      "ballista",
      "barricade",
      "basher",
      "belt_of_strength",
      "bfury",
      "black_grimoire",
      "black_king_bar",
      "black_powder_bag",
      "blade_mail",
      "blade_of_alacrity",
      "blades_of_attack",
      "blight_stone",
      "blighted_spirit",
      "blink",
      "blitz_knuckles",
      "blood_grenade",
      "bloodstone",
      "bloodthorn",
      "book_of_shadows",
      "boots",
      "boots_of_bearing",
      "boots_of_elves",
      "bottle",
      "bottomless_chalice",
      "bracer",
      "branches",
      "broadsword",
      "broom_handle",
      "buckler",
      "bullwhip",
      "butterfly",
      "caster_rapier",
      "ceremonial_robe",
      "chainmail",
      "cheese",
      "chipped_vest",
      "circlet",
      "circlet_of_the_flayed_twins",
      "clarity",
      "claymore",
      "cloak",
      "cloak_of_flames",
      "clumsy_net",
      "combo_breaker",
      "cornucopia",
      "courier",
      "craggy_coat",
      "crimson_guard",
      "crippling_crossbow",
      "crown",
      "crystal_raindrop",
      "cursed_circlet",
      "cyclone",
      "dagger_of_ristul",
      "dagon",
      "dagon_2",
      "dagon_3",
      "dagon_4",
      "dagon_5",
      "dandelion_amulet",
      "defiant_shell",
      "demon_edge",
      "demonicon",
      "desolator",
      "desolator_2",
      "devastator",
      "dezun_bloodrite",
      "diadem",
      "diffusal_blade",
      "diffusal_blade_2",
      "dimensional_doorway",
      "disperser",
      "divine_regalia",
      "divine_regalia_broken",
      "dormant_curio",
      "doubloon",
      "dragon_lance",
      "dragon_scale",
      "duelist_gloves",
      "dust",
      "eagle",
      "echo_sabre",
      "elixer",
      "elven_tunic",
      "enchanted_mango",
      "enchanted_quiver",
      "energy_booster",
      "enhancement_alert",
      "enhancement_audacious",
      "enhancement_boundless",
      "enhancement_brawny",
      "enhancement_crude",
      "enhancement_curious",
      "enhancement_dominant",
      "enhancement_evolved",
      "enhancement_feverish",
      "enhancement_fierce",
      "enhancement_fleetfooted",
      "enhancement_greedy",
      "enhancement_keen_eyed",
      "enhancement_mystical",
      "enhancement_quickened",
      "enhancement_restorative",
      "enhancement_thick",
      "enhancement_timeless",
      "enhancement_titanic",
      "enhancement_tough",
      "enhancement_vampiric",
      "enhancement_vast",
      "enhancement_wise",
      "essence_ring",
      "eternal_shroud",
      "ethereal_blade",
      "ex_machina",
      "eye_of_the_vizier",
      "faded_broach",
      "faerie_fire",
      "falcon_blade",
      "fallen_sky",
      "famango",
      "flask",
      "flayers_bota",
      "flicker",
      "fluffy_hat",
      "flying_courier",
      "force_boots",
      "force_field",
      "force_staff",
      "fortitude_ring",
      "furion_gold_bag",
      "fusion_rune",
      "gale_guard",
      "gauntlets",
      "gem",
      "ghost",
      "giant_maul",
      "giants_ring",
      "gladiator_helm",
      "glimmer_cape",
      "gloves",
      "gloves_of_travel",
      "gossamer_cape",
      "grandmasters_glaive",
      "great_famango",
      "greater_crit",
      "greater_faerie_fire",
      "greater_famango",
      "greater_mango",
      "grisgris",
      "grove_bow",
      "guardian_greaves",
      "gungir",
      "gunpowder_gauntlets",
      "hand_of_midas",
      "harpoon",
      "havoc_hammer",
      "headdress",
      "heart",
      "heavens_halberd",
      "heavy_blade",
      "hellbear_totem",
      "helm_of_iron_will",
      "helm_of_the_dominator",
      "helm_of_the_overlord",
      "helm_of_the_undying",
      "hermes_sandals",
      "holy_locket",
      "hood_of_defiance",
      "horizon",
      "horizons_equilibrium",
      "hurricane_pike",
      "hyperstone",
      "icarus_wings",
      "idol_of_screeauk",
      "illusionsts_cape",
      "imp_claw",
      "infused_raindrop",
      "invis_sword",
      "iron_talon",
      "ironwood_tree",
      "javelin",
      "jidi_pollen_bag",
      "kaya",
      "kaya_and_sange",
      "keen_optic",
      "kobold_cup",
      "lance_of_pursuit",
      "lesser_crit",
      "lifesteal",
      "light_collector",
      "light_robes",
      "lotus_orb",
      "lunar_crest",
      "madstone_bundle",
      "maelstrom",
      "mage_slayer",
      "magic_stick",
      "magic_wand",
      "magnifying_monocle",
      "mana_draught",
      "manacles_of_power",
      "mango_tree",
      "manta",
      "mantle",
      "martyrs_plate",
      "mask_of_madness",
      "mechanical_arm",
      "medallion_of_courage",
      "mekansm",
      "metamorphic_mandible",
      "meteor_hammer",
      "mind_breaker",
      "miniboss_minion_summoner",
      "minotaur_horn",
      "mirror_shield",
      "misericorde",
      "mithril_hammer",
      "mjollnir",
      "monkey_king_bar",
      "moon_shard",
      "muertas_gun",
      "mutation_tombstone",
      "mysterious_hat",
      "mystic_staff",
      "necronomicon",
      "necronomicon_2",
      "necronomicon_3",
      "nemesis_curse",
      "nether_shawl",
      "neutral_tabi",
      "ninja_gear",
      "null_talisman",
      "nullifier",
      "oakheart",
      "oblivion_staff",
      "occult_bracelet",
      "ocean_heart",
      "octarine_core",
      "ofrenda",
      "ofrenda_pledge",
      "ofrenda_shovel",
      "ogre_axe",
      "ogre_heart",
      "ogre_seal_totem",
      "orb_of_corrosion",
      "orb_of_destruction",
      "orb_of_frost",
      "orb_of_venom",
      "orchid",
      "outworld_staff",
      "overflowing_elixir",
      "overwhelming_blink",
      "paintball",
      "paladin_sword",
      "panic_button",
      "pavise",
      "penta_edged_sword",
      "pers",
      "phase_boots",
      "philosophers_stone",
      "phoenix_ash",
      "phylactery",
      "pipe",
      "pirate_hat",
      "platemail",
      "pocket_roshan",
      "pocket_tower",
      "pogo_stick",
      "point_booster",
      "polliwog_charm",
      "poor_mans_shield",
      "possessed_mask",
      "power_treads",
      "princes_knife",
      "psychic_headband",
      "pupils_gift",
      "pyrrhic_cloak",
      "quarterstaff",
      "quelling_blade",
      "quickening_charm",
      "quicksilver_amulet",
      "radiance",
      "rapier",
      "rattlecage",
      "reaver",
      "recipe",
      "refresher",
      "refresher_shard",
      "relic",
      "repair_kit",
      "revenants_brooch",
      "riftshadow_prism",
      "ring_of_aquila",
      "ring_of_basilius",
      "ring_of_health",
      "ring_of_protection",
      "ring_of_regen",
      "ring_of_tarrasque",
      "rippers_lash",
      "river_painter",
      "river_painter2",
      "river_painter3",
      "river_painter4",
      "river_painter5",
      "river_painter6",
      "river_painter7",
      "robe",
      "rod_of_atos",
      "roshans_banner",
      "royal_jelly",
      "royale_with_cheese",
      "safety_bubble",
      "sample_picker",
      "samurai_tabi",
      "sange",
      "sange_and_yasha",
      "satanic",
      "satchel",
      "searing_signet",
      "seeds_of_serenity",
      "seer_stone",
      "serrated_shiv",
      "shadow_amulet",
      "sheepstick",
      "shivas_guard",
      "silver_edge",
      "sisters_shroud",
      "skadi",
      "slime_vial",
      "slippers",
      "smoke_of_deceit",
      "sobi_mask",
      "solar_crest",
      "soul_booster",
      "soul_ring",
      "spark_of_courage",
      "specialists_array",
      "spell_prism",
      "sphere",
      "spider_legs",
      "spirit_vessel",
      "spy_gadget",
      "staff_of_wizardry",
      "star_mace",
      "stormcrafter",
      "stout_shield",
      "super_blink",
      "swift_blink",
      "talisman_of_evasion",
      "tango",
      "tango_single",
      "the_leveller",
      "third_eye",
      "tiara_of_selemene",
      "tier1_token",
      "tier2_token",
      "tier3_token",
      "tier4_token",
      "tier5_token",
      "timeless_relic",
      "titan_sliver",
      "tome_of_aghanim",
      "tome_of_knowledge",
      "tome_of_omniscience",
      "tpscroll",
      "tranquil_boots",
      "travel_boots",
      "travel_boots_2",
      "trickster_cloak",
      "trident",
      "trusty_shovel",
      "turtle_shell",
      "ultimate_orb",
      "ultimate_scepter",
      "ultimate_scepter_2",
      "ultimate_scepter_roshan",
      "unrelenting_eye",
      "unstable_wand",
      "unwavering_condition",
      "urn_of_shadows",
      "vambrace",
      "vampire_fangs",
      "vanguard",
      "veil_of_discord",
      "vengeances_shadow",
      "venom_gland",
      "vindicators_axe",
      "vitality_booster",
      "vladmir",
      "void_stone",
      "voodoo_mask",
      "wand_of_sanctitude",
      "wand_of_the_brine",
      "ward_dispenser",
      "ward_observer",
      "ward_sentry",
      "warhammer",
      "weighted_dice",
      "whisper_of_the_dread",
      "wind_lace",
      "wind_waker",
      "witch_blade",
      "witches_switch",
      "witless_shako",
      "wizard_glass",
      "woodland_striders",
      "wraith_band",
      "wraith_pact",
      "yasha",
      "yasha_and_kaya"
    ]
  },
  "links": {
    "rdyBase": "https://rdy.gg/en/dota2",
    "match": "https://rdy.gg/en/dota2/matches/",
    "team": "https://rdy.gg/en/dota2/teams/",
    "player": "https://rdy.gg/en/dota2/players/",
    "hero": "https://rdy.gg/en/dota2/heroes/"
  },
  "caveats": [
    "PRIZE POOL: five different totals are published (3,333,614 dotesports, 3,346,688 CyberScore, 3,355,417 Esports Charts and ggscore, 3,358,586 Wikipedia, 3,442,957 GosuGamers) and four different champion shares (1,416,786 / 1,422,468 / 1,426,422 / 1,429,894). The per-placement table in this file is the dotesports set and is NOT authoritative. Do not print an exact total or an exact per-team prize. Use 'more than $3.3 million'.",
    "LIQUIPEDIA STILL COULD NOT BE READ. liquipedia.net/dota2/The_International/2026 returns HTTP 403 to WebFetch and a Cloudflare human-verification interstitial in the browser, which was not bypassed. Coach names for 14 teams, most player real names and all nationalities remain unverified.",
    "POSITIONS 1 TO 5 ARE PARTLY INFERRED. OpenDota confirms exactly 80 player-team pairs for the event, five per team, so nobody was substituted, and it confirms every handle. It does not give lane roles. Positions are verified from net worth and role data for Team Spirit and TEAM VISION only.",
    "COACHES: Miposhka (Team Spirit), Aui_2000 (Team Falcons) and Puppey (TEAM VISION) are confirmed. The other 13 coach fields are still null.",
    "PLAYER REAL NAMES AND NATIONALITIES: verified for the 11 grand final players, the five Team Falcons players and SumaiL and lorenof of Nigma Galaxy. Everything else is null. OpenDota's country codes are demonstrably wrong (Larl and rue 'af', No[o]ne- 'au', Malr1ne 'af', SumaiL 'ax') and were not used.",
    "MATCH COUNT: OpenDota returns 147 matches, press reports 148. The missing game is game 2 of Team Spirit vs BoomBoys, lower bracket semifinal, 22 August; OpenDota records only one game of that 2-0. Main Event is therefore 38 games in OpenDota and 39 in press. All OpenDota-derived figures in this file are internally consistent on 147.",
    "PRESS TRANSCRIPTION ERRORS: every draft here comes from OpenDota picks_bans arrays and all five were re-verified pick by pick. Do not re-copy drafts from press articles.",
    "PEAK VIEWERS: 1,796,267 is the Esports Charts tournament peak, 1,792,174 is the Esports Charts grand final peak. TI 2026 is third all-time behind TI 2021 (2.74M) and TI 2019 (1.97M). CyberScore's claim of more than 3,000,000 and an all-time record is wrong.",
    "TEAM REGIONS: qualifier teams carry the region of the qualifier they won, not the org's home region. LGD Gaming is a Chinese org that qualified through South America with a South American roster. Iron Wing is 1win Team using the Tundra Esports invite slot after acquiring their roster.",
    "GROUP STAGE STANDINGS ORDER: every series and game record in the standings table is confirmed against OpenDota. The ordering inside each win bracket is dotesports' and could not be reproduced from match data, since Swiss tiebreaks are not published. It only affects cosmetic ranks, not who advanced.",
    "FROZEN MOMENT: this file stops at grand final game five with the series at 2-2. It carries no result for game five, no champion and no award. Any storyline with safeBeforeDecider false must not be printed on the hub, use its preDeciderAngle instead."
  ],
  "sources": [
    "https://dotesports.com/dota-2/news/dota-2-ti-2026-schedule-results",
    "https://dotesports.com/dota-2/news/team-spirit-champions-ti-2026",
    "https://api.opendota.com/api/leagues",
    "https://api.opendota.com/api/leagues/19719/matches",
    "https://api.opendota.com/api/leagues/19719/teams",
    "https://api.opendota.com/api/matches/8960577698",
    "https://api.opendota.com/api/matches/8960655084",
    "https://api.opendota.com/api/matches/8960762254",
    "https://api.opendota.com/api/matches/8960882635",
    "https://api.opendota.com/api/matches/8960991322",
    "https://api.opendota.com/api/explorer",
    "https://api.opendota.com/api/heroes",
    "https://www.gosugamers.net/dota2/news/79030-team-spirit-defeat-team-vision-to-win-the-international-2026-claim-third-aegis-of-champions",
    "https://www.gosugamers.net/dota2/news/78988-the-international-2026-group-stage-meta-overview-here-are-the-most-popular-hero-picks-and-bans",
    "https://www.gosugamers.net/dota2/tournaments/62969-the-international-2026",
    "https://www.hotspawn.com/dota2/news/team-spirit-wins-the-international-2026-full-ti15-grand-finals-breakdown",
    "https://rdy.gg/en/dota2/news/team-spirit-champions-the-internationa-2026",
    "https://rdy.gg/en/dota2/news/the-international-team-and-hero-statistics",
    "https://www.dota2protips.com/blog/10-heroes-that-defined-the-international-2026",
    "https://escharts.com/tournaments/dota2/international-2026",
    "https://esportnow.gg/dota2/news/the-international-2026-playoffs-bracket-quarterfinals",
    "https://rayesports.com/ti-2026-results-standings-playoff-bracket/",
    "https://www.strafe.com/news/read/this-is-how-team-spirit-won-the-international-2026/",
    "https://www.ghacks.net/2026/08/13/dota-2-the-international-2026-runs-august-13-to-23-in-shanghai-with-16-teams-and-a-2-9-million-prize-pool/",
    "https://liquipedia.net/dota2/The_International/2026 (BLOCKED: 403 plus human-verification interstitial, not read)",
    "https://en.wikipedia.org/wiki/The_International_(esports)",
    "https://cyberscore.live/en/news/the-international-2026-format-schedule-results-standings/",
    "https://escharts.com/news/team-spirit-makes-history-international-2026",
    "https://insider-gaming.com/team-spirit-win-historic-third-ti-at-the-international-2026-in-thrilling-grand-final/",
    "https://www.gosugamers.net/dota2/news/79025-team-vision-are-the-first-team-to-advance-to-the-international-2026-grand-finals",
    "https://www.gosugamers.net/dota2/news/79024-sumail-announces-retirement-following-nigma-galaxy-s-elimination-from-the-international-2026",
    "https://www.gosugamers.net/dota2/news/79113-team-falcons-announce-departure-from-competitive-dota-2",
    "https://dotesports.com/dota-2/news/virtus-pro-disbands-dota-2-roster-ti-2026",
    "https://api.opendota.com/api/leagues/19719 (league name and tier)",
    "https://api.opendota.com/api/explorer (fact-check aggregates: rosters, hero picks and bans, records, durations)"
  ]
};
