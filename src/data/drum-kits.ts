export interface DrumKit {
  id: string;
  name: string;
  style: string;
  description: string;
  instruments: string[];
  audioUrl: string; // pre-recorded pattern preview url
}

export const DRUM_KITS: DrumKit[] = [
  {
    id: "classic-808",
    name: "Vintage 808",
    style: "Trap / Hip-Hop",
    description: "Booming sub bass, crisp snapping snares, and super tight hats defining classic modern hip-hop.",
    instruments: ["Sub Kick", "Crisp Snare", "Closed Hat", "Open Hat", "Cowbell"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: "acoustic-retro",
    name: "Retro Acoustic",
    style: "Rock / Indie",
    description: "Warm, punchy real wood acoustic drum kit with organic overhead room reverb, perfect for rock & roll.",
    instruments: ["Maple Kick", "Solid Snare", "Rack Tom", "Floor Tom", "Ride Cymbal"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: "cyberpunk-industrial",
    name: "Cyberpunk Industrial",
    style: "Synthwave / EBM",
    description: "Cold, heavily gated, compressed metallic punches and synthesized mechanical crashes for futuristic atmospheres.",
    instruments: ["Deep Gated Kick", "Metal Snare", "Bitcrushed Hat", "Analog Perc", "Iron Rimbeat"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  {
    id: "latin-fiesta",
    name: "Latin Fiesta",
    style: "Salsa / Reggae",
    description: "Upbeat organic patterns with high-pitched rimshots, acoustic shakers, bongos, and warm congas.",
    instruments: ["Rimshot", "Conga Low", "Conga High", "Shaker", "Clave", "Agogo"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },
  {
    id: "modern-trap-heat",
    name: "Modern Trap Heat",
    style: "Modern RnB",
    description: "Aggressive short kicks, fast rolls, synth claps, and metallic percussive details optimized for high tempo tracks.",
    instruments: ["Stab Kick", "Synth Clap", "Roll Hat", "Chirp Hat", "Snare Accent"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  },
  {
    id: "jazz-fusion",
    name: "Jazz Fusion",
    style: "Jazz / Progressive",
    description: "Delicate and highly technical brushes, ghost snaps, dynamic brass snares, and resonant sweet cymbal swishes.",
    instruments: ["Soft Kick", "Brush Snare", "Ride Cymbal", "Sizzle Cymbal", "Woodblock"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
  }
];
