/** Plain-English one-liners for styles people meet most, so the tags teach the genre map. */
const BLURBS: Record<string, string> = {
  Bassline: "Four-on-the-floor kick with a wobbly, bouncy bass doing the work. Sheffield and Leeds, 135–140 BPM.",
  "UK Garage": "Swung, shuffling drums at 130–135 BPM. 2-step skips kicks so it bounces; vocals chopped up.",
  "Speed Garage": "Garage's heavier cousin: four-on-the-floor kicks with a big bass wobble.",
  Dubstep: "Around 140 BPM, half-time drums and heavy sub-bass. The dark root of most '140' music.",
  Grime: "London, around 140 BPM: sharp, cold synths, MCs spitting fast over sparse beats.",
  "Drum n Bass": "About 170 BPM, fast chopped breakbeats and deep bass.",
  Jungle: "Drum & bass's ancestor: frantic, chopped breaks with reggae and sound-system bass.",
  Halftime: "Drum & bass tempo, but the drums hit half as often, so it feels slow and heavy.",
  Breakbeat: "Built on chopped drum breaks instead of a steady kick.",
  Breaks: "Broken, sampled drum loops; funky and rolling rather than four-on-the-floor.",
  House: "Four-on-the-floor at 120–128 BPM: the kick on every beat, made for dancing.",
  "Deep House": "Slower, warmer house with soulful chords and plenty of space.",
  "Tech House": "House stripped back towards techno: groove, percussion, few melodies.",
  Minimal: "Sparse and hypnotic. A handful of sounds looped and shifted slowly.",
  "Minimal Techno": "Techno reduced to its pulse: repetition, tiny changes, long builds.",
  Techno: "Driving, machine-made rhythm at 125–140 BPM; built on repetition.",
  Downtempo: "Slow, laid-back electronic music: grooves for winding down.",
  Ambient: "Atmosphere over rhythm; textures and pads, little or no beat.",
  "Trip Hop": "Slow, moody breakbeats from 90s Bristol, often with smoky vocals.",
  Chillwave: "Hazy, nostalgic synth-pop washed in reverb.",
  "Tropical House": "Bright, mellow house with marimbas, steel drums and summer vocals.",
  Trap: "Rap over booming 808 bass and skittering hi-hats; Atlanta-born, everywhere now.",
  "Cloud Rap": "Dreamy, hazy beats under melodic, often mumbled rap; the SoundCloud sound.",
  "Boom Bap": "Classic 90s hip hop: punchy sampled drums and a kick-snare 'boom-bap'.",
  Conscious: "Lyric-first rap about society, politics and life.",
  "Jazzy Hip-Hop": "Hip hop built on jazz samples: warm chords, laid-back drums.",
  Gangsta: "Hard-edged street rap, often West Coast funk-based.",
  "RnB/Swing": "R&B with hip-hop drums; smooth vocals over swung beats.",
  "Contemporary R&B": "Modern R&B: polished vocals, slick production.",
  "Neo Soul": "Soul music with hip hop and jazz in its bones; warm and loose.",
  Soul: "Gospel-rooted vocals and live grooves.",
  "Indie Rock": "Guitar music with a homemade or alternative edge.",
  "Alternative Rock": "Rock outside the mainstream: grunge, indie and everything between.",
  "Pop Rock": "Rock songs with pop hooks.",
  Dancehall: "Jamaican rap-singing over digital riddims.",
  Reggaeton: "Latin rap-singing over the dembow rhythm.",
  Bollywood: "Hindi film music: big melodies, mixed with every genre.",
};

export function styleName(label: string) {
  return label.split("---")[1] ?? label;
}

export function styleBlurb(label: string): string | undefined {
  return BLURBS[styleName(label)];
}
