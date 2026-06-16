/* =====================================================================
   The Vault — curated complete Commander decks for Browse > Decks.
   Each deck stores its FULL decklist as raw text (`list`); app.js parses
   it on demand with parseDecklist() (strips set codes / foil markers, and
   normalises "A / B" split cards to "A // B"). Commander is set explicitly.
   The first five are real exported lists; the rest are well-known builds.
   ===================================================================== */
const CURATED_DECKS = [
  {
    id: 'edh-pako', name: 'Pako & Haldan — Fetch & Cast', commander: 'Pako, Arcane Retriever', colors: ['U', 'R', 'G'],
    blurb: 'Temur partners that exile cards off the top and cast them for free — go wide on fetched value.',
    list: `1 Haldan, Avid Arcanist (C20) 2 *F*
1 Pako, Arcane Retriever (C20) 13
1 Auroral Procession (TDM) 169
1 Biosynthic Burst (EOE) 173
1 Blitzball Stadium (FIC) 34
1 Breath of Darigaaz (PLST) INV-138
1 Cartouche of Strength (PLST) AKH-158
1 Chain Reaction (SCD) 126
1 Charge Through (PLST) STX-124
1 Choose Your Weapon (AFR) 175
1 Cinder Glade (SCD) 295
1 Command Tower (WHO) 266
1 Consuming Tide (VOW) 53
1 Decisive Denial (STX) 177
1 Defend the Rider (DFT) 157
1 Dire-Strain Rampage (PMID) 219p *F*
1 Distortion Strike (IMA) 52
1 Doc Aurlock, Grizzled Genius (OTJ) 201
1 Exotic Orchard (ECC) 148
1 Explore (TLE) 259
1 Fae Flight (MKM) 295
1 Flamebraider (ECL) 139
8 Forest (CMR) 511
1 Frostboil Snarl (DRC) 158
1 Gaea's Gift (BRO) 182
1 Game Trail (SCD) 302
1 Generator Servant (M15) 143
1 Harrow (TDC) 258
1 Hinterland Harbor (LCC) 336
1 Hunter's Insight (SCD) 191
1 Hunter's Talent (BLB) 179
1 Inscription of Abundance (ZNR) 186
1 Invigorating Surge (PLST) M21-190
6 Island (CMR) 506
1 Karplusan Forest (BLC) 314
1 Last Night Together (WHO) 140
1 Lost in the Maze (MKM) 64 *F*
1 Memory Lapse (HML) 32b
6 Mountain (M21) 270
1 Negate (TMT) 47
1 Niblis of Frost (C20) 120
1 Orcish Lumberjack (ICE) 210
1 Origin of Metalbending (TLA) 187
1 Party Thrasher (MH3) 129
1 Pentad Prism (EOC) 56
1 Psychic Paper (WHO) 181
1 Reckless Barbarian (PLST) CLB-193
1 Reclaim (7ED) 263
1 Repulsive Mutation (MKM) 227
1 Resculpt (SOC) 201
1 Road / Ruin (MH2) 376
1 Rogue's Passage (DDM) 77
1 Rootbound Crag (FIC) 416
1 Run Away Together (BLB) 67
1 Satyr Hedonist (THS) 174
1 Shivan Reef (EOC) 179
1 Sidequest: Play Blitzball / World Champion, Celestial Weapon (FIN) 158
1 Smokebraider (MM2) 125
1 Sol Ring (SOC) 128
1 Spell Rupture (GTC) 52
1 Spry and Mighty (ECL) 195
1 Storm's Wrath (PTHB) 157p *F*
1 Stump Stomp / Burnwillow Clearing (MH3) 259
1 Sulfur Falls (EOC) 184
1 Sundering Eruption / Volcanic Fissure (MH3) 248
1 Sword Coast Sailor (CLB) 98
1 Tam, Mindful First-Year (ECL) 245
1 Temur Battle Rage (CMM) 264
1 The Royal Scions (PLST) ELD-199
1 Tinder Wall (ICE) 270
1 Trash the Town (OTJ) 186
1 Two-Handed Axe / Sweeping Cleave (CLB) 203
1 Ultimate Magic: Meteor (FIC) 62
1 Unsubstantiate (PLST) EMN-79
1 Veil of Secrecy (BOK) 59
1 Vessel of Volatility (SOI) 189
1 Vineglimmer Snarl (LCC) 368
1 Waltz of Rage (DSK) 165
1 Water Wings (WOE) 77 *F*
1 Wild Shape (AFR) 212
1 Yavimaya Coast (SOC) 425
1 You Come to a River (AFR) 83
1 You See a Guard Approach (AFR) 85`
  },
  {
    id: 'edh-winota', name: 'Winota, Joiner of Forces', commander: 'Winota, Joiner of Forces', colors: ['W', 'R'],
    blurb: 'Boros stax-aggro — attack with non-Humans to flip an army of game-ending Humans into play.',
    list: `1 Winota, Joiner of Forces (IKO) 349 *F*
1 Aether Vial (2X2) 391
1 Ainok Strike Leader (TDC) 51
1 Alexios, Deimos of Kosmos (ACR) 134
1 Ancient Tomb (V12) 1 *F*
1 Angrath's Marauders (LCC) 215
1 Archivist of Oghma (CLB) 4
1 Archon of Emeria (ZNR) 315
1 Arid Mesa (ZEN) 211
1 Auratouched Mage (RAV) 1
1 Aven Interrupter (OTJ) 4
1 Aven Mindcensor (AKH) 5 *F*
1 Battlefield Forge (C20) 257
1 Blade Historian (STX) 165
1 Bloodstained Mire (KTK) 230
1 Boromir, Warden of the Tower (LTR) 455
1 Breath of Fury (RAV) 116
1 Cavern of Souls (AVR) 226
1 Caves of Chaos Adventurer (CLB) 167
1 Chrome Mox (MRD) 152
1 City of Brass (5ED) 413
1 City of Traitors (EXO) 143
1 Clarion Conqueror (TDM) 400 *F*
1 Combat Celebrant (AKH) 125 *F*
1 Command Beacon (PLST) C15-56
1 Command Tower (C20) 264
1 Deafening Silence (ELD) 10 *F*
1 Deflecting Swat (C20) 50
1 Drannith Magistrate (IKO) 314 *F*
1 Eidolon of Rhetoric (JOU) 10 *F*
1 Eiganjo, Seat of the Empire (NEO) 268
1 Enlightened Tutor (6ED) 19
1 Esper Sentinel (MH2) 12
1 Ethersworn Canonist (ALA) 10 *F*
1 Flooded Strand (KTK) 233
1 Gemstone Caverns (TSP) 274
1 Gingerbrute (ELD) 219
1 Giver of Runes (MH1) 13
1 Grand Abolisher (M12) 19 *F*
1 Hexing Squelcher (ECL) 317
1 High Noon (OTJ) 15
1 Hope of Ghirapur (AER) 154 *F*
1 Lena, Selfless Champion (JMP) 117
1 Lightning, Army of One (FIN) 233
1 Lotus Petal (TMP) 294
1 Loyal Apprentice (C18) 23
1 Magus of the Moon (FUT) 101 *F*
1 Mana Confluence (JOU) 163
1 Mana Vault (5ED) 388
1 Marsh Flats (ZEN) 219
1 Mountain (C14) 332
1 Mox Diamond (STH) 138
1 Needleverge Pathway / Pillarverge Pathway (ZNR) 263
1 Ocelot Pride (MH3) 38
1 Orim's Chant (PLST) PLS-11
1 Ornithopter (M11) 211
1 Ornithopter of Paradise (MH2) 232
1 Path to Exile (F15) 7 *F*
1 Phelia, Exuberant Shepherd (MH3) 40
1 Phyrexian Revoker (M15) 225 *F*
1 Phyrexian Walker (VIS) 152
3 Plains (ELD) 251
1 Skrelv, Defector Mite (SLD) 1926
1 Plateau (3ED) 284
1 Powerbalance (MH3) 495 *F*
1 Prismatic Vista (MH1) 244
1 Professional Face-Breaker (SNC) 116
1 Ragavan, Nimble Pilferer (MH2) 315 *F*
1 Ranger-Captain of Eos (MH1) 21
1 Redirect Lightning (TLA) 151
1 Greymond, Avacyn's Stalwart (SLD) 143 *F*
1 Rionya, Fire Dancer (C21) 55
1 Sacred Foundry (GRN) 254
1 Sanctum Prelate (CN2) 23 *F*
1 Scalding Tarn (MM3) 244
1 Serra Ascendant (IMA) 31
1 Shatterskull Smashing / Shatterskull, the Hammer Pass (ZNR) 161
1 Signal Pest (MBS) 131
1 Silence (M11) 30
1 Simian Spirit Guide (A25) 148 *F*
1 Skyclave Apparition (ZNR) 39 *F*
1 Slicer, Hired Muscle / Slicer, High-Speed Antagonist (BOT) 6
1 Sokenzan, Crucible of Defiance (NEO) 276
1 Sol Ring (C20) 252
1 Solitude (MH2) 32
1 Soulless Jailer (ONE) 397
1 Spectator Seating (CMR) 356
1 Spirit of the Labyrinth (BNG) 27 *F*
1 Sunbaked Canyon (MH1) 247
1 Swords to Plowshares (EMA) 32 *F*
1 Tataru Taru (FIC) 30
1 Thalia, Guardian of Thraben (VOW) 318
1 Touch the Spirit Realm (NEO) 40
1 Voice of Victory (PTDM) 33p
1 Windswept Heath (KTK) 248
1 Witch Enchanter / Witch-Blessed Meadow (MH3) 239
1 Wooded Foothills (KTK) 249
1 Zurzoth, Chaos Rider (JMP) 27`
  },
  {
    id: 'edh-urdragon', name: 'The Ur-Dragon — Five-Colour Dragons', commander: 'The Ur-Dragon', colors: ['W', 'U', 'B', 'R', 'G'],
    blurb: 'Slam the biggest Dragons in the game, cheat the eminence discount, and rain fire on the table.',
    list: `1 The Ur-Dragon (SLD) 11 *F*
1 Ancient Copper Dragon (CLB) 368 *F*
1 Ancient Gold Dragon (CLB) 365 *F*
1 Ancient Silver Dragon (CLB) 366 *F*
1 Arcane Signet (SLD) 1492 *F*
1 Arena of Glory (MH3) 351 *F*
1 Arid Mesa (SPG) 114 *F*
1 Avatar's Wrath (TLA) 365 *F*
1 Badlands (3ED) 282
1 Bayou (3ED) 283
1 Birds of Paradise (RVR) 432 *F*
1 Bloodline Bidding (ECL) 385 *F*
1 Bloodstained Mire (EXP) 18 *F*
1 Bloom Tender (ECL) 390 *F*
1 Bonehoard Dracosaur (LCI) 321 *F*
1 Boseiju, Who Endures (NEO) 412 *F*
1 Chromatic Orrery (M21) 228 *F*
1 Chrome Mox (MPS) 9 *F*
1 City of Brass (PSUS) 6 *F*
1 Command Tower (SLD) 1496 *F*
1 Crux of Fate (STA) 88 *F*
1 Delighted Halfling (LTR) 774 *F*
1 Demonic Tutor (SLD) 1856 *F*
1 Dracogenesis (TDM) 412 *F*
1 Dragon Tempest (PL24) 7 *F*
1 Dragonhawk, Fate's Tempest (BLB) 291 *F*
1 Dragonlord Dromoka (SLD) 1971 *F*
1 Dragonlord Kolaghan (SLD) 1972 *F*
1 Exotic Orchard (SLD) 1231 *F*
1 Fellwar Stone (CMM) 657 *F*
1 Flooded Strand (EXP) 16 *F*
1 Forbidden Orchard (EXP) 39 *F*
1 Goldspan Dragon (SLD) 1780 *F*
1 Helga, Skittish Seer (BLB) 332 *F*
1 Hellkite Courser (CMR) 183 *F*
1 Reflecting Pool (LTC) 373 *F*
1 Ignoble Hierarch (MH2) 414 *F*
1 Imoti, Celebrant of Bounty (MUL) 173 *F*
1 Ketria Triome (IKO) 310 *F*
1 Kiora, Behemoth Beckoner (SLD) 1700 *F*
1 Klauth, Unrivaled Ancient (SLD) 2499 *F*
1 Lathliss, Dragon Queen (M19) 149 *F*
1 Lorehold, the Historian (SOS) 284 *F*
1 Mana Confluence (EXP) 42 *F*
1 Mana Vault (MPS) 17 *F*
1 Marsh Flats (SPG) 115 *F*
1 Miirym, Sentinel Wyrm (SLD) 2500 *F*
1 Misty Rainforest (SPG) 116 *F*
1 Mountain (PL24) 5 *F*
1 Mox Diamond (V10) 10 *F*
1 Neriv, Heart of the Storm (TDM) 314 *F*
1 Noble Hierarch (PPRO) 2018 *F*
1 Old Gnawbone (AFR) 296 *F*
1 Cavern of Souls (LTC) 362 *F*
1 Plateau (3ED) 284
1 Polluted Delta (EXP) 17 *F*
1 Rhythm of the Wild (RVR) 380 *F*
1 Roaming Throne (LCI) 258 *F*
1 Savai Triome (IKO) 312 *F*
1 Savannah (3ED) 285
1 Scalding Tarn (SPG) 117 *F*
1 Scion of Draco (MH2) 323 *F*
1 Scrubland (3ED) 286
1 Selvala, Heart of the Wilds (CMM) 571 *E*
1 Smaug the Magnificent (HOB) 249
1 Sol Ring (SLD) 1494 *F*
1 Steely Resolve (ONS) 286 *F*
1 Stubborn Denial (KTK) 56 *F*
1 Swan Song (SLD) 1591 *F*
1 Sylvia Brightspear (BBD) 10 *F*
1 Taiga (3ED) 287
1 Teferi's Protection (SLD) 1691 *F*
1 Temur Ascendancy (TSR) 387 *F*
1 Terror of the Peaks (M21) 164 *F*
1 The One Ring (LTR) 791 *F*
1 Tiamat (PAFR) 235a *F*
1 Tropical Island (3ED) 288
1 Tundra (3ED) 289
1 Twinflame Tyrant (FDN) 437 *F*
1 Underground Sea (3ED) 290
1 Up the Beanstalk (WOE) 195 *F*
1 Ureni of the Unwritten (TDC) 9 *F*
1 Utvara Hellkite (RVR) 431 *F*
1 Verdant Catacombs (SPG) 118 *F*
1 Volcanic Island (3ED) 291
1 Windswept Heath (EXP) 20 *F*
1 Wooded Foothills (EXP) 19 *F*
1 Zagoth Triome (IKO) 313 *F*
1 Zurgo and Ojutai (MOM) 319 *F*`
  },
  {
    id: 'edh-krark', name: 'Krark & Sakashima — Izzet Spellslinger', commander: 'Krark, the Thumbless', colors: ['U', 'R'],
    blurb: 'Flip coins, copy your commander, and chain rituals into a lethal storm of free spells.',
    list: `1 Krark, the Thumbless (CMR) 189
1 Sakashima of a Thousand Faces (CMR) 89
1 An Offer You Can't Refuse (BLC) 170
1 Ancient Tomb (PLST) TMP-315
1 Archmage Emeritus (FIC) 261
1 Arid Mesa (MM3) 229
1 Ashling, Flame Dancer (MH3) 115
1 Birgi, God of Storytelling / Harnfel, Horn of Bounty (KHM) 123
1 Bloodstained Mire (MH3) 216
1 Borne Upon a Wind (LTR) 44
1 Brain Freeze (MB2) 24
1 Brainstorm (CST) 61
1 Chrome Mox (EMA) 219
1 City of Brass (TMC) 62
1 City of Traitors (EXO) 143
1 Clever Impersonator (PLST) KTK-34
1 Command Tower (LTC) 301
1 Consider (TLE) 157
1 Crash Through (FDN) 620
1 Crimson Wisps (J25) 533
1 Deflecting Swat (C20) 50
1 Desperate Ritual (CHK) 163
1 Dualcaster Mage (C21) 165
1 Electro, Assaulting Battery (SPM) 260
1 Expedite (BBD) 177
1 Fierce Guardianship (C20) 35
1 Fiery Islet (WHO) 278
1 Flare of Duplication (MH3) 119
1 Flooded Strand (MH3) 220
1 Flusterstorm (MH1) 255
1 Force of Will (DMR) 50
1 Gamble (UMA) 132
1 Gemstone Caverns (TSP) 274
1 Gitaxian Probe (NPH) 35
1 Gut Shot (PLST) MM2-117
1 Harmonic Prodigy (MH2) 352
1 Heroes' Hangout (SPM) 79
1 Into the Flood Maw (BLB) 52
1 Irma, Part-Time Mutant (TMC) 12
1 Island (SUM) 296
1 Jeska's Will (MKC) 156
1 Light Up the Stage (CLU) 140
1 Lightning Bolt (CLB) 401
1 Lion's Eye Diamond (MIR) 307
1 Lotus Petal (MB2) 226
1 Mana Confluence (JOU) 163
1 Mana Vault (5ED) 388
1 Mental Misstep (MB2) 30
1 Might of the Meek (BLB) 144
1 Mindbreak Trap (MAR) 11
1 Misty Rainforest (ZEN) 220
1 Mockingbird (BLB) 61
1 Mogg Salvage (MH2) 282
1 Molten Duplication (BIG) 14
1 Mox Amber (DOM) 224
1 Mox Diamond (STH) 138
1 Muse Seeker (SOS) 60
1 Mystic Remora (ICE) 87
1 Mystical Tutor (SS1) 6
1 Opt (DOM) 60
1 Otawara, Soaring City (PNEO) 271p
1 Overmaster (DMR) 327
1 Pact of Negation (MMA) 56
1 Peek (10E) 94
1 Pinnacle Monk / Mystic Peak (MH3) 246
1 Polluted Delta (MH3) 224
1 Ponder (M12) 73
1 Prismatic Vista (MH1) 244
1 Pyretic Ritual (M11) 153
1 Pyroblast (ICE) 213
1 Relic of Legends (DMU) 236
1 Rite of Flame (SS3) 7
1 Riverpyre Verge (PDFT) 260p
1 Scalding Tarn (ZEN) 223
1 Shivan Reef (TDC) 393
1 Simian Spirit Guide (TSR) 190
1 Sink into Stupor / Soporific Springs (MH3) 241
1 Snow-Covered Mountain (KHM) 283
1 Sol Ring (TMC) 59
1 Steam Vents (ECL) 267
1 Step Through (MH2) 66
1 Storm-Kiln Artist (STX) 115
1 Strike It Rich (MH2) 143
1 Submerge (PLST) NEM-48
1 Swan Song (LTC) 197
1 Tarnished Citadel (TLE) 59
1 Tavern Scoundrel (MH2) 144
1 The Vision and Scarlet Witch (MSC) 707
1 Thought Scour (JMP) 185
1 Thundering Falls (MKM) 269
1 Training Center (CMR) 358
1 Treasonous Ogre (CNS) 36
1 Underworld Breach (PZA) 10
1 Urabrask / The Great Work (MOM) 169
1 Veyran, Voice of Duality (OTC) 248
1 Vivi Ornitier (FIN) 248
1 Volcanic Island (3ED) 291
1 Warlord's Fury (DOM) 151
1 Wooded Foothills (KTK) 249`
  },
  {
    id: 'edh-henzie', name: 'Henzie "Toolbox" Torre — Blitz Reanimator', commander: 'Henzie "Toolbox" Torre', colors: ['B', 'R', 'G'],
    blurb: 'Blitz fat creatures cheaply, sacrifice for value, and reanimate the biggest threats in Jund.',
    list: `1 Henzie "Toolbox" Torre (NCC) 102 *F*
1 Abrupt Decay (OTP) 34
1 Archon of Cruelty (DSC) 371 *F*
1 Arid Mesa (MH2) 244
1 Assassin's Trophy (2X2) 372
1 Badlands (LEB) 278
1 Bane of Progress (CC1) 3
1 Bayou (LEB) 279
1 Birds of Paradise (RVR) 432
1 Birthing Pod (SLC) 2011
1 Birthing Ritual (MH3) 337
1 Blood Crypt (RVR) 292
1 Bloodstained Mire (MH3) 352
1 Bloom Tender (2X2) 366
1 Blossoming Tortoise (WOE) 354 *F*
1 Boseiju, Who Endures (NEO) 501 *F*
1 Bringer of the Last Gift (LCI) 337 *F*
1 Chainer, Nightmare Adept (MH2) 419 *F*
1 City of Brass (MD1) 15
1 Command Tower (REX) 26
1 Damage Control Crew (SPM) 99
1 Deadly Rollick (CMM) 695
1 Deadpool, Trading Card (SLD) 1753
1 Deathrite Shaman (SLC) 2012
1 Deflecting Swat (CMM) 698
1 Delighted Halfling (LTR) 402
1 Demonic Tutor (STA) 27
1 Druid of Purification (SLD) 877 *F*
1 Elves of Deep Shadow (SLD) 1710 *F*
1 Elvish Mystic (CMM) 648
1 Elvish Spirit Guide (SLD) 423
1 Incarnation Technique (SLD) 1776 *F*
1 Etali, Primal Conqueror / Etali, Primal Sickness (MOM) 298
2 Forest (UND) 96 *F*
1 Fyndhorn Elves (CMR) 228
1 Gaea's Cradle (USG) 321
1 Gray Merchant of Asphodel (SLC) 7
1 Greater Good (SLD) 1693
1 Gwenom, Remorseless (SPM) 256
1 Ignoble Hierarch (MH2) 355 *F*
1 Incinerator of the Guilty (MKM) 381 *F*
1 Junji, the Midnight Sky (SLC) 10
1 Karplusan Forest (DMU) 379
1 Kokusho, the Evening Star (SLD) 1528 *F*
1 Living Death (PLST) A25-96
1 Lizard, Connors's Curse (SPM) 265
1 Llanowar Elves (SLC) 12
1 Llanowar Wastes (BRO) 299
1 Luxury Suite (CLB) 355
1 Marsh Flats (MH2) 476
1 Massacre Wurm (M21) 316
1 Mikaeus, the Unhallowed (CMM) 675
1 Misty Rainforest (MM3) 240
2 Mountain (UND) 94 *F*
1 Noxious Revival (SLD) 1416
1 Ojer Kaslem, Deepest Growth / Temple of Cultivation (LCI) 318 *F*
1 Overgrown Tomb (RVR) 296
1 Overlord of the Hauntwoods (DSK) 395 *F*
1 Phyrexian Delver (INV) 115
1 Primeval Herald (J22) 42
1 Protean Hulk (RVR) 435
1 Rampant Rejuvenator (NEC) 70
1 Ravenous Chupacabra (SLD) 305
1 Reanimate (OTP) 18
1 Roxanne, Starfall Savant (OTJ) 362
1 Scalding Tarn (MH2) 478
1 Seedguide Ash (LRW) 235
1 Sheoldred / The True Scriptures (MOM) 297
1 Simian Spirit Guide (SLD) 1548
1 Skullclamp (PLST) C17-222
1 Sowing Mycospawn (MH3) 340
1 Spire Garden (CLB) 606
1 Stomping Ground (RVR) 299
1 Sulfurous Springs (DMU) 381
1 Survival of the Fittest (EXO) 129
3 Swamp (UND) 92 *F*
1 Taiga (LEA) 282
1 Takenuma, Abandoned Mire (NEO) 416
1 Underground Mortuary (MKM) 333
1 Undergrowth Stadium (CMM) 666
1 Utopia Sprawl (WOT) 63
1 Vampiric Tutor (DMR) 430
1 Verdant Catacombs (MH2) 479
1 Viscera Seer (CMR) 658
1 Wasteland Raider (PIP) 383
1 Wild Growth (ICE) 277
1 Will of the Abzan (TDC) 71
1 Windswept Heath (MH3) 360
1 Wooded Foothills (MH3) 361
1 Worldly Tutor (DMR) 442`
  },
  {
    id: 'edh-krenko', name: 'Krenko, Mob Boss — Goblin Swarm', commander: 'Krenko, Mob Boss', colors: ['R'],
    blurb: 'Tap Krenko to double your Goblin horde, then overrun the table with anthems and burn.',
    list: `1 Krenko, Mob Boss
1 Goblin Chieftain
1 Goblin Warchief
1 Goblin King
1 Goblin Rabblemaster
1 Goblin Recruiter
1 Goblin Matron
1 Goblin Instigator
1 Mogg War Marshal
1 Krenko's Command
1 Dragon Fodder
1 Hordeling Outburst
1 Beetleback Chief
1 Legion Loyalist
1 Reckless Bushwhacker
1 Goblin Bushwhacker
1 Goblin Trashmaster
1 Conspicuous Snoop
1 Goblin Ringleader
1 Pashalik Mons
1 Muxus, Goblin Grandee
1 Quicksmith Rebel
1 Squee, Goblin Nabob
1 Skirk Prospector
1 Goblin Chirurgeon
1 Krenko, Tin Street Kingpin
1 Hanweir Garrison
1 Goblin Sharpshooter
1 Impact Tremors
1 Purphoros, God of the Forge
1 Goblin Bombardment
1 Shared Animosity
1 Coat of Arms
1 Door of Destinies
1 Mob Justice
1 Massive Raid
1 Brightstone Ritual
1 Lightning Bolt
1 Chaos Warp
1 Vandalblast
1 Blasphemous Act
1 Faithless Looting
1 Wheel of Fortune
1 Sol Ring
1 Arcane Signet
1 Mind Stone
1 Fellwar Stone
1 Thought Vessel
1 Skullclamp
1 Thousand-Year Elixir
1 Lightning Greaves
1 Swiftfoot Boots
1 Goblin Warrens
1 Outpost Siege
1 Cavern of Souls
1 Castle Embereth
1 Den of the Bugbear
1 Rogue's Passage
1 Buried Ruin
1 War Room
1 Command Beacon
1 Spinerock Knoll
1 Ramunap Ruins
1 Sokenzan, Crucible of Defiance
36 Mountain`
  },
  {
    id: 'edh-atraxa', name: "Atraxa, Praetors' Voice — Superfriends", commander: "Atraxa, Praetors' Voice", colors: ['W', 'U', 'B', 'G'],
    blurb: 'Cast planeswalkers, proliferate their loyalty every turn, and ultimate your way to victory.',
    list: `1 Atraxa, Praetors' Voice
1 Doubling Season
1 Evolution Sage
1 Vorinclex, Monstrous Raider
1 The Chain Veil
1 Deepglow Skate
1 Flux Channeler
1 Tezzeret the Seeker
1 Teferi, Hero of Dominaria
1 Kaya, Geist Hunter
1 Vraska, Golgari Queen
1 Nissa, Voice of Zendikar
1 Garruk Wildspeaker
1 Ajani, Mentor of Heroes
1 Elspeth, Sun's Champion
1 Tamiyo, the Moon Sage
1 Karn Liberated
1 Ugin, the Spirit Dragon
1 The Eldest Reborn
1 Inexorable Tide
1 Contagion Engine
1 Contagion Clasp
1 Tezzeret's Gambit
1 Sol Ring
1 Arcane Signet
1 Fellwar Stone
1 Mind Stone
1 Chromatic Lantern
1 Cultivate
1 Kodama's Reach
1 Farseek
1 Nature's Lore
1 Swords to Plowshares
1 Anguished Unmaking
1 Cyclonic Rift
1 Toxic Deluge
1 Damnation
1 Counterspell
1 Smothering Tithe
1 Rhystic Study
1 Lightning Greaves
1 Command Tower
1 Exotic Orchard
1 Reflecting Pool
1 Spara's Headquarters
1 Indatha Triome
1 Zagoth Triome
1 Breeding Pool
1 Watery Grave
1 Godless Shrine
1 Overgrown Tomb
1 Temple Garden
1 Hallowed Fountain
1 Marsh Flats
1 Windswept Heath
1 Misty Rainforest
1 Verdant Catacombs
1 Sunken Hollow
1 Canopy Vista
1 Prairie Stream
1 Yavimaya Coast
1 Llanowar Wastes
1 Karn's Bastion
1 Command Beacon
1 Liliana Vess
1 Jace, the Mind Sculptor
1 Narset, Parter of Veils
1 Tamiyo, Collector of Tales
1 Vraska, Relic Seeker
1 Kaya the Inexorable
1 Tezzeret, Artifice Master
1 Saheeli, the Gifted
1 Oath of Teferi
1 Pir, Imaginative Rascal
1 Azorius Signet
1 Golgari Signet
1 Selesnya Signet
1 Solemn Simulacrum
1 Sakura-Tribe Elder
1 Despark
1 Beast Within
1 Putrefy
1 Vindicate
5 Forest
4 Plains
4 Island
4 Swamp`
  },
  {
    id: 'edh-edgar', name: 'Edgar Markov — Vampire Aristocrats', commander: 'Edgar Markov', colors: ['W', 'B', 'R'],
    blurb: "Edgar's eminence floods the board with Vampire tokens, then anthems and drains finish the table.",
    list: `1 Edgar Markov
1 Captivating Vampire
1 Bloodline Keeper
1 Vampire Nocturnus
1 Sorin, Lord of Innistrad
1 Olivia Voldaren
1 Champion of Dusk
1 Sanctum Seeker
1 Cordial Vampire
1 Bloodthirsty Aerialist
1 Vampire of the Dire Moon
1 Vicious Conquistador
1 Indulgent Aristocrat
1 Legion Lieutenant
1 Stensia Masquerade
1 Drana, Liberator of Malakir
1 Bloodsworn Steward
1 Vampire Hexmage
1 Falkenrath Aristocrat
1 Patron of the Vein
1 Cruel Celebrant
1 Pawn of Ulamog
1 Twilight Prophet
1 Necropolis Regent
1 Mavren Fein, Dusk Apostle
1 New Blood
1 Bloodline Necromancer
1 Anguished Unmaking
1 Swords to Plowshares
1 Path to Exile
1 Mortify
1 Terminate
1 Blasphemous Act
1 Vampiric Rites
1 Skullclamp
1 Sol Ring
1 Arcane Signet
1 Mind Stone
1 Fellwar Stone
1 Coat of Arms
1 Vanquisher's Banner
1 Cathars' Crusade
1 Shared Animosity
1 Lightning Greaves
1 Swiftfoot Boots
1 Command Tower
1 Exotic Orchard
1 Path of Ancestry
1 Savai Triome
1 Sacred Foundry
1 Blood Crypt
1 Godless Shrine
1 Bloodstained Mire
1 Marsh Flats
1 Windswept Heath
1 Smoldering Marsh
1 Caves of Koilos
1 Sunbaked Canyon
1 Castle Locthwain
1 Command Beacon
1 Rogue's Passage
1 Bloodghast
1 Gifted Aetherborn
1 Knight of the Ebon Legion
1 Dusk Legion Zealot
1 Adanto Vanguard
1 Anowon, the Ruin Sage
1 Vish Kal, Blood Arbiter
1 Kalitas, Traitor of Ghet
1 Vona, Butcher of Magan
1 Bloodlord of Vaasgoth
1 Anointed Procession
1 Herald's Horn
1 Kindred Dominance
1 Blade of the Bloodchief
1 Teferi's Protection
1 Talisman of Indulgence
1 Boros Signet
1 Rakdos Signet
1 Orzhov Signet
11 Swamp
5 Mountain
4 Plains`
  },
  {
    id: 'edh-yuriko', name: "Yuriko, the Tiger's Shadow — Ninjas", commander: "Yuriko, the Tiger's Shadow", colors: ['U', 'B'],
    blurb: 'Sneak evasive ninjas in to flip Yuriko, reveal a fat top-deck, and drain the table for its mana value.',
    list: `1 Yuriko, the Tiger's Shadow
1 Changeling Outcast
1 Ingenious Infiltrator
1 Mistblade Shinobi
1 Fallen Shinobi
1 Silver-Fur Master
1 Mothdust Changeling
1 Universal Automaton
1 Thousand-Faced Shadow
1 Cunning Evasion
1 Mist-Syndicate Naga
1 Ornithopter
1 Slither Blade
1 Tormented Soul
1 Gudul Lurker
1 Faerie Seer
1 Ninja of the Deep Hours
1 Dokuchi Silencer
1 Biting-Palm Ninja
1 Prosperous Thief
1 Azra Smokeshaper
1 Triton Shorestalker
1 Walker of Secret Ways
1 Phantom Ninja
1 Okiba-Gang Shinobi
1 Higure, the Still Wind
1 Throat Slitter
1 Sakashima's Student
1 Moonblade Shinobi
1 Coastal Piracy
1 Bident of Thassa
1 Reconnaissance Mission
1 Mind's Eye
1 Sword of Feast and Famine
1 Sol Ring
1 Arcane Signet
1 Mind Stone
1 Fellwar Stone
1 Thought Vessel
1 Dimir Signet
1 Lightning Greaves
1 Swiftfoot Boots
1 Brainstorm
1 Ponder
1 Preordain
1 Mystic Remora
1 Rhystic Study
1 Counterspell
1 Swan Song
1 Fierce Guardianship
1 Cyclonic Rift
1 Toxic Deluge
1 Damnation
1 Reanimate
1 Command Tower
1 Path of Ancestry
1 Watery Grave
1 Drowned Catacomb
1 Sunken Hollow
1 Choked Estuary
1 Polluted Delta
1 Marsh Flats
1 Otawara, Soaring City
1 Takenuma, Abandoned Mire
1 Rogue's Passage
1 Command Beacon
1 Treasure Cruise
1 Dig Through Time
1 Whispersilk Cloak
1 Sword of the Animist
1 Kindred Discovery
1 Fatal Push
1 Go for the Throat
1 Baleful Strix
1 Murderous Cut
13 Island
12 Swamp`
  },
  {
    id: 'edh-meren', name: 'Meren of Clan Nel Toth — Graveyard Value', commander: 'Meren of Clan Nel Toth', colors: ['B', 'G'],
    blurb: 'Sacrifice creatures for value, build experience counters, and recur threats from the graveyard forever.',
    list: `1 Meren of Clan Nel Toth
1 Sakura-Tribe Elder
1 Eternal Witness
1 Fleshbag Marauder
1 Merciless Executioner
1 Plaguecrafter
1 Spore Frog
1 Viscera Seer
1 Blood Artist
1 Zulaport Cutthroat
1 Grim Haruspex
1 Mycoloth
1 Grave Titan
1 Sidisi, Undead Vizier
1 Massacre Wurm
1 Sheoldred, Whispering One
1 Butcher of Malakir
1 Reveillark
1 Karmic Guide
1 Disciple of Bolas
1 Pitiless Plunderer
1 Caustic Caterpillar
1 Yawgmoth, Thran Physician
1 Mazirek, Kraul Death Priest
1 Dictate of Erebos
1 Grave Pact
1 Phyrexian Reclamation
1 Skullclamp
1 Ashnod's Altar
1 Phyrexian Altar
1 Sol Ring
1 Arcane Signet
1 Golgari Signet
1 Mind Stone
1 Fellwar Stone
1 Cultivate
1 Kodama's Reach
1 Nature's Lore
1 Farseek
1 Eldritch Evolution
1 Victimize
1 Animate Dead
1 Reanimate
1 Living Death
1 Demonic Tutor
1 Vampiric Tutor
1 Toxic Deluge
1 Damnation
1 Beast Within
1 Putrefy
1 Assassin's Trophy
1 Lightning Greaves
1 Swiftfoot Boots
1 Command Tower
1 Path of Ancestry
1 Overgrown Tomb
1 Woodland Cemetery
1 Llanowar Wastes
1 Twilight Mire
1 Marsh Flats
1 Verdant Catacombs
1 Bloodstained Mire
1 Khalni Garden
1 Bojuka Bog
1 Command Beacon
1 Rogue's Passage
1 Solemn Simulacrum
1 Wood Elves
1 Acidic Slime
1 Fierce Empath
1 Jarad, Golgari Lich Lord
1 Golgari Findbroker
1 Birthing Pod
1 Buried Alive
1 Casualties of War
13 Swamp
12 Forest`
  }
];
