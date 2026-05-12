import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";

const NOTES = [
  { idx: 0, jp: "ド", en: "C", sharp: false },
  { idx: 1, jp: "ド♯", en: "C#", sharp: true },
  { idx: 2, jp: "レ", en: "D", sharp: false },
  { idx: 3, jp: "レ♯", en: "D#", sharp: true },
  { idx: 4, jp: "ミ", en: "E", sharp: false },
  { idx: 5, jp: "ファ", en: "F", sharp: false },
  { idx: 6, jp: "ファ♯", en: "F#", sharp: true },
  { idx: 7, jp: "ソ", en: "G", sharp: false },
  { idx: 8, jp: "ソ♯", en: "G#", sharp: true },
  { idx: 9, jp: "ラ", en: "A", sharp: false },
  { idx: 10, jp: "ラ♯", en: "A#", sharp: true },
  { idx: 11, jp: "シ", en: "B", sharp: false },
];

const MAJ7 = [0, 2, 4, 5, 7, 9, 11];
const MIN7 = [0, 2, 3, 5, 7, 8, 10];

function buildIntervalScale(scale7, N) {
  const degToSemi = (deg) => {
    const oct = Math.floor(deg / 7);
    const within = ((deg % 7) + 7) % 7;
    return oct * 12 + scale7[within];
  };
  const asc = [];
  for (let i = 0; i <= 6; i++) {
    const a = degToSemi(i);
    const b = degToSemi(i + N);
    asc.push(a, b, a, b);
  }
  const top = degToSemi(7);
  const desc = [];
  for (let i = 7; i >= 1; i--) {
    const a = degToSemi(i);
    const b = degToSemi(i - N);
    desc.push(a, b, a, b);
  }
  desc.push(degToSemi(0));
  return { asc, top, desc };
}

const SCALES = [
  {
    name: "5度スケール", nameEn: "5th Scale",
    group: "each",
    majorDesc: "ド・レ・ミ・ファ・ソ・ファ・ミ・レ・ド",
    majorDescEn: "C · D · E · F · G · F · E · D · C",
    minorDesc: "ド・レ・ミ♭・ファ・ソ・ファ・ミ♭・レ・ド",
    minorDescEn: "C · D · E♭ · F · G · F · E♭ · D · C",
    major: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    minor: [0, 2, 3, 5, 7, 5, 3, 2, 0],
  },
  {
    name: "7thアルペジオ", nameEn: "7th Arpeggio",
    group: "each",
    majorDesc: "ド・ミ・ソ・シ・ド・シ・ソ・ミ・ド",
    majorDescEn: "C · E · G · B · C · B · G · E · C",
    minorDesc: "ド・ミ♭・ソ・シ♭・ド・シ♭・ソ・ミ♭・ド",
    minorDescEn: "C · E♭ · G · B♭ · C · B♭ · G · E♭ · C",
    major: [0, 4, 7, 11, 12, 11, 7, 4, 0],
    minor: [0, 3, 7, 10, 12, 10, 7, 3, 0],
  },
  {
    name: "3和音アルペジオ", nameEn: "Triad Arpeggio",
    group: "each",
    majorDesc: "ド・ミ・ソ・ド・ソ・ミ・ド",
    majorDescEn: "C · E · G · C · G · E · C",
    minorDesc: "ド・ミ♭・ソ・ド・ソ・ミ♭・ド",
    minorDescEn: "C · E♭ · G · C · G · E♭ · C",
    major: [0, 4, 7, 12, 7, 4, 0],
    minor: [0, 3, 7, 12, 7, 3, 0],
  },
  {
    name: "全音階", nameEn: "Diatonic Scale",
    group: "each",
    majorDesc: "ド・レ・ミ・ファ・ソ・ラ・シ・ド",
    majorDescEn: "C · D · E · F · G · A · B · C",
    minorDesc: "ド・レ・ミ♭・ファ・ソ・ラ♭・シ♭・ド",
    minorDescEn: "C · D · E♭ · F · G · A♭ · B♭ · C",
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
  },
  {
    name: "クロマチック（ド〜ミ往復）", nameEn: "Chromatic (C–E)",
    group: "each",
    majorDesc: "ド〜ミまで半音ずつ上がって戻る",
    majorDescEn: "Semitones up to E, then back down",
    minorDesc: "ド〜ミ♭まで半音ずつ上がって戻る",
    minorDescEn: "Semitones up to E♭, then back down",
    major: [0, 1, 2, 3, 4, 3, 2, 1, 0],
    minor: [0, 1, 2, 3, 2, 1, 0],
  },
  {
    name: "3度往復スケール", nameEn: "3rd Interval Scale",
    group: "first",
    majorDesc: "ド ミ・レ ファ・ミ ソ… 3度往復で上下行",
    majorDescEn: "C E · D F · E G … ascend & descend in 3rds",
    minorDesc: "ド ミ♭・レ ファ・ミ♭ ソ… 3度往復で上下行",
    minorDescEn: "C E♭ · D F · E♭ G … ascend & descend in 3rds",
    majorParts: buildIntervalScale(MAJ7, 2),
    minorParts: buildIntervalScale(MIN7, 2),
  },
  {
    name: "4度往復スケール", nameEn: "4th Interval Scale",
    group: "first",
    majorDesc: "ド ファ・レ ソ・ミ ラ… 4度往復で上下行",
    majorDescEn: "C F · D G · E A … ascend & descend in 4ths",
    minorDesc: "ド ファ・レ ソ・ミ♭ ラ♭… 4度往復で上下行",
    minorDescEn: "C F · D G · E♭ A♭ … ascend & descend in 4ths",
    majorParts: buildIntervalScale(MAJ7, 3),
    minorParts: buildIntervalScale(MIN7, 3),
  },
  {
    name: "5度往復スケール", nameEn: "5th Interval Scale",
    group: "first",
    majorDesc: "ド ソ・レ ラ・ミ シ… 5度往復で上下行",
    majorDescEn: "C G · D A · E B … ascend & descend in 5ths",
    minorDesc: "ド ソ・レ ラ♭・ミ♭ シ♭… 5度往復で上下行",
    minorDescEn: "C G · D A♭ · E♭ B♭ … ascend & descend in 5ths",
    majorParts: buildIntervalScale(MAJ7, 4),
    minorParts: buildIntervalScale(MIN7, 4),
  },
  {
    name: "6度往復スケール", nameEn: "6th Interval Scale",
    group: "first",
    majorDesc: "ド ラ・レ シ・ミ ド… 6度往復で上下行",
    majorDescEn: "C A · D B · E C … ascend & descend in 6ths",
    minorDesc: "ド ラ♭・レ シ♭・ミ♭ ド… 6度往復で上下行",
    minorDescEn: "C A♭ · D B♭ · E♭ C … ascend & descend in 6ths",
    majorParts: buildIntervalScale(MAJ7, 5),
    minorParts: buildIntervalScale(MIN7, 5),
  },
];

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  ja: {
    modeLabel:  "Mode  ·  モード",
    scaleLabel: "Scale  ·  パターン",
    dirLabel:   "Direction  ·  移調方向",
    tempoLabel: (bpm) => `Tempo  ·  ${bpm} BPM`,
    volLabel:   "Volume  ·  音量",
    noteLabel:  "Start Note  ·  開始音",
    majorLabel: "メジャー", majorSub: "Major",
    minorLabel: "マイナー", minorSub: "Minor",
    dirUp: "上行", dirDown: "下行", dirUpDown: "往復",
    groupEach:  "♩ 各キーに和音",
    groupFirst: "♩ 最初のキーのみ和音",
    tapToStop:  "tap to stop",
    tapToBegin: "tap to begin",
    loading:    "音源を読込中…",
    audioError:    (m) => `音声起動失敗: ${m}`,
    patternEmpty:  (n, m) => `パターンが空です (${n} / ${m})`,
    playError:     (m) => `再生エラー: ${m}`,
    scaleName: (s) => s.name,
    scaleDesc: (s, mode) => mode === "major" ? s.majorDesc : s.minorDesc,
    presetsLabel: "My Routine  ·  マイ・ルーティン",
    savePreset:   "＋ 現在の設定を保存",
    presetNamePrompt: "プリセット名（例：朝の声出し）",
    confirmDelete: (n) => `「${n}」を削除しますか？`,
    nowPlaying:   "再生中",
  },
  en: {
    modeLabel:  "Mode",
    scaleLabel: "Scale  ·  Pattern",
    dirLabel:   "Direction",
    tempoLabel: (bpm) => `Tempo  ·  ${bpm} BPM`,
    volLabel:   "Volume",
    noteLabel:  "Start Note",
    majorLabel: "Major", majorSub: "",
    minorLabel: "Minor", minorSub: "",
    dirUp: "Ascend", dirDown: "Descend", dirUpDown: "Both",
    groupEach:  "♩ Chord each key",
    groupFirst: "♩ Chord first key only",
    tapToStop:  "tap to stop",
    tapToBegin: "tap to begin",
    loading:    "Loading piano…",
    audioError:    (m) => `Audio error: ${m}`,
    patternEmpty:  (n, m) => `Empty pattern (${n} / ${m})`,
    playError:     (m) => `Playback error: ${m}`,
    scaleName: (s) => s.nameEn,
    scaleDesc: (s, mode) => mode === "major" ? s.majorDescEn : s.minorDescEn,
    presetsLabel: "My Routine",
    savePreset:   "＋ Save current setup",
    presetNamePrompt: "Preset name (e.g. Morning warm-up)",
    confirmDelete: (n) => `Delete "${n}"?`,
    nowPlaying:   "Now playing",
  },
};

// ── Salamander Grand Piano sample URLs ────────────────────────────────────────
const SALAMANDER_URLS = {
  A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
  A7: "A7.mp3", C8: "C8.mp3",
};

const pctToDb = (pct) => {
  if (pct <= 0) return -Infinity;
  return -30 + (pct / 100) * 30;
};

function Label({ children }) {
  return (
    <div style={{
      fontSize: "11px", color: "#7a8598", letterSpacing: "0.22em",
      textTransform: "uppercase", marginBottom: "12px",
      fontFamily: "'Zen Kaku Gothic New', sans-serif", fontWeight: 700,
    }}>
      {children}
    </div>
  );
}

function Section({ label, children, right }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
        <Label>{label}</Label>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function VocalApp() {
  const [lang, setLang] = useState("ja");
  const [mode, setMode] = useState("major");
  const [scaleIdx, setScaleIdx] = useState(0);
  const [direction, setDirection] = useState("up");
  const [bpm, setBpm] = useState(112);
  const [startNote, setStartNote] = useState(0);
  const [octave, setOctave] = useState(4);
  const [pianoVolPct, setPianoVolPct] = useState(70);
  const [clickVolPct, setClickVolPct] = useState(40);

  // ── Presets (persisted via localStorage) ────────────────────────────────
  const [presets, setPresets] = useState(() => {
    try {
      const raw = typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem("vocal-warmup-presets")
        : null;
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vocal-warmup-presets", JSON.stringify(presets));
      }
    } catch (e) {}
  }, [presets]);

  const savePreset = () => {
    const name = window.prompt(t.presetNamePrompt);
    if (!name || !name.trim()) return;
    setPresets((prev) => [
      ...prev,
      { id: Date.now(), name: name.trim(), mode, scaleIdx, direction, bpm, startNote, octave },
    ]);
  };

  const loadPreset = (p) => {
    if (isPlaying) return;
    setMode(p.mode);
    setScaleIdx(p.scaleIdx);
    setDirection(p.direction);
    setBpm(p.bpm);
    setStartNote(p.startNote);
    setOctave(p.octave);
  };

  const deletePreset = (p, e) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDelete(p.name))) {
      setPresets((prev) => prev.filter((x) => x.id !== p.id));
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(null);
  const [stepNum, setStepNum] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [tickPulse, setTickPulse] = useState(0); // increments on each metronome click

  // ── Tanuki animation state ──────────────────────────────────────────────
  // Phases: idle (標準) → prep (ジャンプ準備) → jump (ジャンプ) → land (着地) → idle
  const TANUKI_POSES = { idle: "標準", prep: "ジャンプ準備", jump: "ジャンプ", land: "着地" };
  const [tanukiOffset, setTanukiOffset] = useState(0);
  const [tanukiPhase, setTanukiPhase] = useState("idle");
  const [tanukiFacing, setTanukiFacing] = useState("right");
  const prevTanukiOffsetRef = useRef(0);
  const tanukiTimersRef = useRef([]);

  // Preload all 8 sprites once on mount so animation is instant
  useEffect(() => {
    Object.values(TANUKI_POSES).forEach((pose) => {
      ["", "_逆"].forEach((suffix) => {
        const img = new Image();
        img.src = `/tanuki_${pose}${suffix}.png`;
      });
    });
  }, []);

  // Trigger jump animation cycle whenever currentOffset changes
  useEffect(() => {
    // clear any in-flight animation timers
    tanukiTimersRef.current.forEach((id) => clearTimeout(id));
    tanukiTimersRef.current = [];

    if (currentOffset === null) {
      setTanukiPhase("idle");
      return;
    }
    const prev = prevTanukiOffsetRef.current;
    if (currentOffset !== prev) {
      setTanukiFacing(currentOffset > prev ? "right" : "left");
    }
    setTanukiPhase("prep");
    const t1 = setTimeout(() => {
      setTanukiPhase("jump");
      setTanukiOffset(currentOffset);
      prevTanukiOffsetRef.current = currentOffset;
    }, 110);
    const t2 = setTimeout(() => setTanukiPhase("land"), 380);
    const t3 = setTimeout(() => setTanukiPhase("idle"), 520);
    tanukiTimersRef.current = [t1, t2, t3];
    return () => tanukiTimersRef.current.forEach((id) => clearTimeout(id));
  }, [currentOffset]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  // Single Sampler replaces the 3 chord voices + melody synth
  const samplerRef    = useRef(null);
  const clickRef      = useRef(null);
  const pianoVolRef   = useRef(null);
  const clickVolRef   = useRef(null);
  const reverbRef     = useRef(null);
  const playingRef    = useRef(false);
  const timeoutsRef   = useRef([]);
  const pianoVolPctRef = useRef(70);
  const clickVolPctRef = useRef(40);

  const t = T[lang];

  useEffect(() => {
    pianoVolPctRef.current = pianoVolPct;
    if (pianoVolRef.current) pianoVolRef.current.volume.rampTo(pctToDb(pianoVolPct), 0.05);
  }, [pianoVolPct]);

  useEffect(() => {
    clickVolPctRef.current = clickVolPct;
    if (clickVolRef.current) clickVolRef.current.volume.rampTo(pctToDb(clickVolPct), 0.05);
  }, [clickVolPct]);

  const sleep = (ms) =>
    new Promise((resolve) => {
      const id = setTimeout(() => {
        timeoutsRef.current = timeoutsRef.current.filter((x) => x !== id);
        resolve();
      }, ms);
      timeoutsRef.current.push(id);
    });

  // ── Audio init: creates Sampler with real piano samples ───────────────────
  const initAudio = async () => {
    if (audioReady) return;
    try {
      await Tone.start();
      const ctx = Tone.getContext();
      if (ctx.state !== "running") await ctx.resume();
    } catch (e) { throw new Error("音声起動失敗: " + e.message); }

    const pianoVol = new Tone.Volume(pctToDb(pianoVolPctRef.current)).toDestination();
    pianoVolRef.current = pianoVol;
    const clickVol = new Tone.Volume(pctToDb(clickVolPctRef.current)).toDestination();
    clickVolRef.current = clickVol;

    // Hall reverb — longer & wetter than before for realistic piano acoustics
    const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.28 }).connect(pianoVol);
    reverbRef.current = reverb;

    // Salamander Grand Piano — 30 velocity-mapped sample points across 8 octaves
    const sampler = new Tone.Sampler({
      urls: SALAMANDER_URLS,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).connect(reverb);
    samplerRef.current = sampler;

    // Wait for reverb IR and all audio samples, then let the audio
    // context fully stabilize before the first note is scheduled.
    await reverb.generate();
    await Tone.loaded();
    await new Promise((r) => setTimeout(r, 200));

    // Metronome click stays as a lightweight sine burst
    const click = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
    }).connect(clickVol);
    clickRef.current = click;

    setAudioReady(true);
  };

  const releaseAll = () => {
    try { samplerRef.current?.releaseAll(); } catch (e) {}
  };

  const stopAll = () => {
    playingRef.current = false;
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    releaseAll();
    setIsPlaying(false);
    setCurrentOffset(null);
    setStepNum(0);
  };

  const tickClick = () => {
    if (!clickRef.current || clickVolPctRef.current <= 0) return;
    try { clickRef.current.triggerAttackRelease("C6", 0.018); } catch (e) {}
    setTickPulse((p) => p + 1);
  };

  const handlePress = async () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    if (isPlaying) { stopAll(); return; }
    if (isLoading) return;
    setErrorMsg("");

    if (!audioReady) {
      setIsLoading(true);
      try { await initAudio(); } catch (e) { setErrorMsg(e.message); setIsLoading(false); return; }
      setIsLoading(false);
    }

    playingRef.current = true;
    setIsPlaying(true);
    setDone(false);
    setStepNum(0);

    const scale = SCALES[scaleIdx];
    const isFirstOnly = scale.group === "first";
    const parts   = isFirstOnly ? scale[mode + "Parts"] : null;
    const pattern = isFirstOnly ? null : scale[mode];

    if (!isFirstOnly && (!Array.isArray(pattern) || pattern.length === 0)) {
      setErrorMsg(t.patternEmpty(scale.name, mode));
      playingRef.current = false; setIsPlaying(false); return;
    }
    if (isFirstOnly && !parts) {
      setErrorMsg(t.patternEmpty(scale.name, mode));
      playingRef.current = false; setIsPlaying(false); return;
    }

    const secs   = 60 / bpm;
    const beatMs = secs * 1000;
    const baseMidi = (octave + 1) * 12 + startNote;

    const up13   = Array.from({ length: 13 }, (_, i) => i);
    const dn13   = Array.from({ length: 13 }, (_, i) => 12 - i);
    const updown = [...up13, ...Array.from({ length: 12 }, (_, i) => 11 - i)];
    const offsets = direction === "up" ? up13 : direction === "down" ? dn13 : updown;
    setTotalSteps(offsets.length);

    const midiToNote = (m) => Tone.Frequency(m, "midi").toNote();

    let keyMidi = 0;

    const playNotes = async (semis) => {
      for (const semi of semis) {
        if (!playingRef.current) return false;
        tickClick();
        try { samplerRef.current.triggerAttackRelease(midiToNote(keyMidi + semi), secs * 0.85); } catch (e) {}
        await sleep(beatMs);
      }
      return true;
    };

    await sleep(220);

    try {
      for (let oi = 0; oi < offsets.length; oi++) {
        if (!playingRef.current) break;

        const offset = offsets[oi];
        keyMidi = baseMidi + offset;
        const ci = mode === "minor" ? [0, 3, 7] : [0, 4, 7];
        const chordNotes = ci.map((i) => midiToNote(keyMidi + i));

        if (oi > 0) releaseAll();

        setCurrentOffset(offset);
        setStepNum(oi + 1);

        const playChordHere = !isFirstOnly || oi === 0;

        if (playChordHere) {
          // Beat 1: chord (softer velocity so melody stands out)
          tickClick();
          chordNotes.forEach((note) => {
            try { samplerRef.current.triggerAttackRelease(note, secs * 0.92, Tone.now(), 0.5); } catch (e) {}
          });
          await sleep(beatMs);
          if (!playingRef.current) break;
          // Beat 2: rest / preparation
          tickClick();
          await sleep(beatMs);
          if (!playingRef.current) break;
          // ← releaseAll() removed: notes already ended via their duration param
        } else {
          tickClick();
          await sleep(beatMs);
          if (!playingRef.current) break;
        }

        if (isFirstOnly && parts) {
          if (!await playNotes(parts.asc)) break;
          if (!playingRef.current) break;

          // Peak note: hold 1 beat
          tickClick();
          try { samplerRef.current.triggerAttackRelease(midiToNote(keyMidi + parts.top), secs * 0.92); } catch (e) {}
          await sleep(beatMs);
          if (!playingRef.current) break;
          releaseAll();
          tickClick();
          await sleep(beatMs);
          if (!playingRef.current) break;

          if (!await playNotes(parts.desc)) break;
        } else {
          for (const semi of pattern) {
            if (!playingRef.current) break;
            tickClick();
            try { samplerRef.current.triggerAttackRelease(midiToNote(keyMidi + semi), secs * 0.85); } catch (e) {}
            await sleep(beatMs);
          }
        }
        if (!playingRef.current) break;

        releaseAll();
        tickClick();
        await sleep(beatMs);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg(t.playError(e.message));
    }

    releaseAll();

    if (playingRef.current) {
      playingRef.current = false;
      setIsPlaying(false);
      setCurrentOffset(null);
      setDone(true);
      const id = setTimeout(() => setDone(false), 3000);
      timeoutsRef.current.push(id);
    }
  };

  useEffect(() => () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    try { samplerRef.current?.dispose(); }  catch (e) {}
    try { clickRef.current?.dispose(); }    catch (e) {}
    try { reverbRef.current?.dispose(); }   catch (e) {}
    try { pianoVolRef.current?.dispose(); } catch (e) {}
    try { clickVolRef.current?.dispose(); } catch (e) {}
  }, []);

  const curNote = currentOffset !== null ? NOTES[(startNote + currentOffset) % 12] : null;
  const progress = totalSteps > 0 ? (stepNum / totalSteps) * 100 : 0;

  return (
    <div style={{
        fontFamily: "'Zen Kaku Gothic New', sans-serif",
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, rgba(232,184,109,0.05) 0%, transparent 55%), linear-gradient(170deg, #050710 0%, #0a0e1c 50%, #050710 100%)",
        color: "#e6e2d6",
        maxWidth: "480px",
        margin: "0 auto",
        padding: "0 18px 56px",
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #050710; overscroll-behavior: none; }
        @keyframes pop        { from { opacity:0; transform:scale(0.55); } to { opacity:1; transform:scale(1); } }
        @keyframes glow       { 0%,100% { box-shadow:0 0 22px rgba(232,184,109,0.35),0 0 50px rgba(232,184,109,0.15); } 50% { box-shadow:0 0 36px rgba(232,184,109,0.6),0 0 70px rgba(232,184,109,0.32); } }
        @keyframes ghostPulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:0.8; transform:scale(1.04); } }
        @keyframes ringRipple { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(1.7); opacity:0; } }
        @keyframes tickPulseAnim { 0% { transform:scale(1); opacity:0.7; } 100% { transform:scale(1.22); opacity:0; } }
        @keyframes noteGlow      { 0% { box-shadow:0 0 0 rgba(255,217,122,0); transform:scale(1); } 40% { box-shadow:0 0 22px rgba(255,217,122,0.7); transform:scale(1.05); } 100% { box-shadow:0 0 14px rgba(255,217,122,0.45); transform:scale(1); } }
        @keyframes idleBreath { 0%,100% { box-shadow:inset 0 1px 2px rgba(255,255,255,0.4),inset 0 -3px 8px rgba(0,0,0,0.25),0 12px 38px rgba(232,184,109,0.4),0 0 0 0 rgba(232,184,109,0.3); } 50% { box-shadow:inset 0 1px 2px rgba(255,255,255,0.4),inset 0 -3px 8px rgba(0,0,0,0.25),0 12px 42px rgba(232,184,109,0.5),0 0 0 8px rgba(232,184,109,0.05); } }
        @keyframes spin       { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes tanukiSway { 0% { transform:rotate(0deg); } 25% { transform:rotate(-2deg); } 50% { transform:rotate(0deg); } 75% { transform:rotate(2deg); } 100% { transform:rotate(0deg); } }
        input[type=range] { -webkit-appearance:none; appearance:none; height:6px; border-radius:3px; background:#1f2334; outline:none; width:100%; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:24px; height:24px; border-radius:50%; background:linear-gradient(145deg,#f0c884,#c9943a); cursor:pointer; box-shadow:0 2px 10px rgba(232,184,109,0.5),inset 0 1px 1px rgba(255,255,255,0.3); }
        input[type=range]::-moz-range-thumb { width:24px; height:24px; border:none; border-radius:50%; background:linear-gradient(145deg,#f0c884,#c9943a); cursor:pointer; }
        .play-btn { -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none; }
        button { -webkit-tap-highlight-color:transparent; }
        .lang-btn:hover { border-color:#4a5570 !important; color:#b0bcd0 !important; }
      `}</style>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", padding: "32px 0 22px", position: "relative" }}>

          {/* Language toggle */}
          <div style={{ position: "absolute", right: 0, top: "36px" }}>
            <button
              className="lang-btn"
              onClick={() => setLang(l => l === "ja" ? "en" : "ja")}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid #2a3040",
                borderRadius: "20px",
                padding: "5px 14px",
                color: "#6a7590",
                fontSize: "11px",
                letterSpacing: "0.15em",
                cursor: "pointer",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                transition: "all 0.18s",
              }}
            >
              {lang === "ja" ? "EN" : "日本語"}
            </button>
          </div>

          <div style={{ fontSize: "11px", letterSpacing: "0.42em", color: "#5a6478", marginBottom: "10px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
            ÉTUDE  ·  N°1
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "44px", fontStyle: "italic", fontWeight: 600, color: "#f0c884", lineHeight: 1.05, textShadow: "0 0 30px rgba(232,184,109,0.25)" }}>
            Vocal Warm-Up
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
            <div style={{ height: "1px", width: "36px", background: "linear-gradient(90deg, transparent, #4a5570)" }} />
            <div style={{ fontSize: "10px", color: "#5a6478", letterSpacing: "0.3em" }}>♩ ♪ ♩</div>
            <div style={{ height: "1px", width: "36px", background: "linear-gradient(90deg, #4a5570, transparent)" }} />
          </div>
        </div>

        {/* ── Status ── */}
        <div style={{ height: "138px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "38px", height: "38px", border: "2px solid rgba(240,200,132,0.18)", borderTop: "2px solid #f0c884", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 14px" }} />
              <div style={{ fontSize: "12px", color: "#7a8598", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.1em" }}>
                {t.loading}
              </div>
            </div>
          ) : curNote ? (
            <div style={{ textAlign: "center", animation: "pop 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <div style={{ fontSize: "11px", color: "#7a8598", letterSpacing: "0.22em", marginBottom: "10px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600 }}>
                Key {stepNum} / {totalSteps}
              </div>
              <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "radial-gradient(ellipse at 30% 25%, rgba(255,235,190,0.55) 0%, transparent 55%), linear-gradient(165deg, #f4cd8c 0%, #d49642 50%, #a87520 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "glow 1.4s ease-in-out infinite", margin: "0 auto", border: "1px solid rgba(255,220,160,0.3)" }}>
                <span style={{ fontSize: lang === "ja" ? "30px" : "22px", fontWeight: "900", color: "#1c1208", lineHeight: 1, fontFamily: lang === "ja" ? "'Zen Kaku Gothic New', sans-serif" : "'Cormorant Garamond', serif", fontStyle: lang === "en" ? "italic" : "normal" }}>
                  {lang === "ja" ? curNote.jp : curNote.en}
                </span>
                <span style={{ fontSize: "11px", color: "#1c1208", opacity: 0.55, marginTop: "3px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.05em", fontWeight: 600 }}>
                  {lang === "ja" ? curNote.en : curNote.jp}
                </span>
              </div>
            </div>
          ) : done ? (
            <div style={{ fontSize: "18px", color: "#f0c884", animation: "pop 0.3s ease", padding: "14px 32px", border: "1px solid rgba(232,184,109,0.3)", borderRadius: "30px", background: "rgba(232,184,109,0.06)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "0.05em" }}>
              ✓ Finis
            </div>
          ) : errorMsg ? (
            <div style={{ fontSize: "13px", color: "#ff9b9b", textAlign: "center", padding: "0 16px", lineHeight: 1.6 }}>{errorMsg}</div>
          ) : (
            <div style={{ width: "96px", height: "96px", borderRadius: "50%", border: "1px dashed rgba(232,184,109,0.25)", display: "flex", alignItems: "center", justifyContent: "center", animation: "ghostPulse 2.4s ease-in-out infinite" }}>
              <span style={{ fontSize: "32px", color: "rgba(232,184,109,0.5)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>♪</span>
            </div>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginBottom: "30px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${isPlaying ? progress : 0}%`, background: "linear-gradient(90deg, #c49340, #f0c884, #f8dca8)", borderRadius: "2px", transition: "width 0.5s ease", boxShadow: "0 0 10px rgba(232,184,109,0.6)" }} />
        </div>

        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, #2a3344, transparent)", marginBottom: "26px" }} />

        {/* ── My Routine (Presets) ── */}
        <Section label={t.presetsLabel}>
          {presets.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              {presets.map((p) => (
                <div
                  key={p.id}
                  onClick={() => loadPreset(p)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "9px 12px 9px 14px",
                    borderRadius: "20px",
                    border: "1.5px solid #2a3040",
                    background: "rgba(255,255,255,0.035)",
                    cursor: isPlaying ? "default" : "pointer",
                    opacity: isPlaying ? 0.45 : 1,
                    transition: "all 0.18s",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#b0bcd0", fontWeight: 600 }}>
                    {p.name}
                  </span>
                  <button
                    onClick={(e) => deletePreset(p, e)}
                    style={{
                      background: "none", border: "none", color: "#5a6478",
                      cursor: "pointer", padding: "0 0 0 4px",
                      fontSize: "14px", lineHeight: 1, display: "flex",
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={savePreset}
            disabled={isPlaying}
            style={{
              width: "100%", padding: "12px",
              borderRadius: "12px",
              border: "1.5px dashed #2a3040",
              background: "rgba(255,255,255,0.02)",
              color: "#7a8598",
              fontSize: "13px", fontWeight: 600,
              cursor: isPlaying ? "default" : "pointer",
              opacity: isPlaying ? 0.4 : 1,
              transition: "all 0.18s",
              fontFamily: "'Zen Kaku Gothic New', sans-serif",
            }}
          >
            {t.savePreset}
          </button>
        </Section>

        {/* ── Mode ── */}
        <Section label={t.modeLabel}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { val: "major", label: t.majorLabel, sub: t.majorSub },
              { val: "minor", label: t.minorLabel, sub: t.minorSub },
            ].map((m) => (
              <button key={m.val} onClick={() => !isPlaying && setMode(m.val)} style={{ flex: 1, padding: "14px 10px", textAlign: "center", borderRadius: "12px", border: `1.5px solid ${mode === m.val ? "#f0c884" : "#2a3040"}`, background: mode === m.val ? "rgba(232,184,109,0.12)" : "rgba(255,255,255,0.025)", color: mode === m.val ? "#f0c884" : "#8a96b0", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.18s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                <div style={{ fontSize: "16px", fontWeight: mode === m.val ? "700" : "500" }}>{m.label}</div>
                {m.sub && <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "3px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 500 }}>{m.sub}</div>}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Scale ── */}
        <Section label={t.scaleLabel}>
          {(() => {
            const sel = SCALES[scaleIdx];
            const accent = sel.group === "first" ? "#7eafff" : "#f0c884";
            return (
              <>
                <div style={{ position: "relative" }}>
                  <select
                    value={scaleIdx}
                    onChange={(e) => !isPlaying && setScaleIdx(+e.target.value)}
                    disabled={isPlaying}
                    style={{
                      width: "100%",
                      padding: "13px 40px 13px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${accent}`,
                      background: sel.group === "first" ? "rgba(126,175,255,0.1)" : "rgba(232,184,109,0.1)",
                      color: accent,
                      fontSize: "14px",
                      fontWeight: 700,
                      fontFamily: "'Zen Kaku Gothic New', sans-serif",
                      cursor: isPlaying ? "default" : "pointer",
                      opacity: isPlaying ? 0.45 : 1,
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      outline: "none",
                    }}
                  >
                    <optgroup label={t.groupEach} style={{ background: "#0a0e1c", color: "#b0bcd0" }}>
                      {SCALES.filter((s) => s.group === "each").map((s) => {
                        const i = SCALES.indexOf(s);
                        return <option key={i} value={i} style={{ background: "#0a0e1c", color: "#e6e2d6" }}>{t.scaleName(s)}</option>;
                      })}
                    </optgroup>
                    <optgroup label={t.groupFirst} style={{ background: "#0a0e1c", color: "#b0bcd0" }}>
                      {SCALES.filter((s) => s.group === "first").map((s) => {
                        const i = SCALES.indexOf(s);
                        return <option key={i} value={i} style={{ background: "#0a0e1c", color: "#e6e2d6" }}>{t.scaleName(s)}</option>;
                      })}
                    </optgroup>
                  </select>
                  <span style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: accent,
                    fontSize: "10px",
                    pointerEvents: "none",
                    opacity: isPlaying ? 0.45 : 1,
                  }}>▼</span>
                </div>
                <div style={{
                  marginTop: "10px",
                  padding: "11px 14px",
                  fontSize: "12px",
                  color: "#9aa6c0",
                  fontWeight: 500,
                  lineHeight: 1.55,
                  fontFamily: "'Zen Kaku Gothic New', sans-serif",
                  borderLeft: `2px solid ${accent}`,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "4px",
                  opacity: isPlaying ? 0.6 : 1,
                }}>
                  {t.scaleDesc(sel, mode)}
                </div>
              </>
            );
          })()}
        </Section>

        {/* ── Direction ── */}
        <Section label={t.dirLabel}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { val: "up",     label: t.dirUp,     icon: "↑" },
              { val: "down",   label: t.dirDown,   icon: "↓" },
              { val: "updown", label: t.dirUpDown, icon: "⇅" },
            ].map((d) => (
              <button key={d.val} onClick={() => !isPlaying && setDirection(d.val)} style={{ flex: 1, padding: "14px 6px", textAlign: "center", borderRadius: "12px", border: `1.5px solid ${direction === d.val ? "#7eafff" : "#2a3040"}`, background: direction === d.val ? "rgba(126,175,255,0.12)" : "rgba(255,255,255,0.025)", color: direction === d.val ? "#7eafff" : "#8a96b0", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.18s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                <div style={{ fontSize: "24px", lineHeight: 1 }}>{d.icon}</div>
                <div style={{ fontSize: "13px", marginTop: "6px", fontWeight: direction === d.val ? "700" : "500" }}>{d.label}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Tempo ── */}
        <Section label={t.tempoLabel(bpm)}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => !isPlaying && setBpm((b) => Math.max(40, b - 1))}
              disabled={isPlaying || bpm <= 40}
              style={{
                width: "38px", height: "38px", borderRadius: "50%",
                border: "1.5px solid #2a3040",
                background: "rgba(255,255,255,0.04)",
                color: "#b0bcd0", fontSize: "20px", fontWeight: 700,
                cursor: isPlaying ? "default" : "pointer",
                opacity: isPlaying ? 0.35 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, paddingBottom: "3px",
                fontFamily: "'Cormorant Garamond', serif",
                flexShrink: 0,
              }}
            >−</button>
            <input type="range" min="40" max="200" value={bpm} onChange={(e) => !isPlaying && setBpm(+e.target.value)} disabled={isPlaying} style={{ opacity: isPlaying ? 0.4 : 1, flex: 1 }} />
            <button
              onClick={() => !isPlaying && setBpm((b) => Math.min(200, b + 1))}
              disabled={isPlaying || bpm >= 200}
              style={{
                width: "38px", height: "38px", borderRadius: "50%",
                border: "1.5px solid #2a3040",
                background: "rgba(255,255,255,0.04)",
                color: "#b0bcd0", fontSize: "20px", fontWeight: 700,
                cursor: isPlaying ? "default" : "pointer",
                opacity: isPlaying ? 0.35 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, paddingBottom: "3px",
                fontFamily: "'Cormorant Garamond', serif",
                flexShrink: 0,
              }}
            >+</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#5a6478", marginTop: "10px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 500, letterSpacing: "0.05em" }}>
            <span>40 · lento</span><span>120</span><span>presto · 200</span>
          </div>
        </Section>

        {/* ── Volume ── */}
        <Section label={t.volLabel}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Piano", icon: "♪", color: "#f0c884", val: pianoVolPct, set: setPianoVolPct },
              { label: "Click", icon: "♩", color: "#7eafff", val: clickVolPct, set: setClickVolPct },
            ].map(({ label, icon, color, val, set }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#b0bcd0", fontWeight: 600 }}>
                    <span style={{ color, marginRight: "8px" }}>{icon}</span>{label}
                  </span>
                  <span style={{ fontSize: "12px", color: val === 0 ? "#5a6478" : "#7a8598", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, letterSpacing: val === 0 ? "0.15em" : 0 }}>
                    {val === 0 ? "MUTE" : `${val}%`}
                  </span>
                </div>
                <input type="range" min="0" max="100" value={val} onChange={(e) => set(+e.target.value)} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Start Note ── */}
        <Section label={t.noteLabel}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "7px", marginBottom: "16px" }}>
            {NOTES.map((n) => {
              const isStart = startNote === n.idx;
              const isPlayingNow = isPlaying && currentOffset !== null
                && ((startNote + currentOffset) % 12) === n.idx;
              return (
                <button
                  key={n.idx}
                  onClick={() => !isPlaying && setStartNote(n.idx)}
                  style={{
                    padding: lang === "ja" ? "10px 3px" : "14px 3px",
                    borderRadius: "10px",
                    border: `1.5px solid ${
                      isPlayingNow ? "#ffd97a"
                      : isStart   ? "#f0c884"
                      : n.sharp   ? "#1a1f2e"
                      : "#2a3040"
                    }`,
                    background: isPlayingNow
                      ? "rgba(255,217,122,0.28)"
                      : isStart ? "rgba(232,184,109,0.2)"
                      : n.sharp ? "rgba(255,255,255,0.015)"
                      : "rgba(255,255,255,0.035)",
                    color: isPlayingNow ? "#ffe9b0"
                      : isStart ? "#f0c884"
                      : n.sharp ? "#6a7590"
                      : "#b0bcd0",
                    fontSize: "13px",
                    fontWeight: isStart || isPlayingNow ? "700" : "500",
                    textAlign: "center",
                    cursor: isPlaying ? "default" : "pointer",
                    opacity: isPlaying ? (isPlayingNow ? 1 : 0.45) : 1,
                    transition: "all 0.15s",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    animation: isPlayingNow ? "noteGlow 0.5s ease-out forwards" : "none",
                  }}
                >
                  <div>{lang === "ja" ? n.jp : n.en}</div>
                  {lang === "ja" && (
                    <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "2px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600 }}>
                      {n.en}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", color: "#7a8598", letterSpacing: "0.2em", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, textTransform: "uppercase" }}>octave</span>
            {[3, 4, 5].map((o) => (
              <button key={o} onClick={() => !isPlaying && setOctave(o)} style={{ width: "44px", height: "44px", borderRadius: "50%", border: `1.5px solid ${octave === o ? "#f0c884" : "#2a3040"}`, background: octave === o ? "rgba(232,184,109,0.15)" : "rgba(255,255,255,0.025)", color: octave === o ? "#f0c884" : "#8a96b0", fontSize: "16px", fontWeight: "700", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.15s", fontFamily: "'Cormorant Garamond', serif" }}>
                {o}
              </button>
            ))}
            <span style={{ fontSize: "13px", color: "#7a8598", marginLeft: "6px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600 }}>
              {NOTES[startNote].en}{octave}
            </span>
          </div>
        </Section>

        {/* ── Tanuki Staircase ── */}
        {(() => {
          const NUM_STEPS = 13;
          const STAIR_PCT = 62;
          const stepW = 100 / NUM_STEPS;
          const stepH = STAIR_PCT / NUM_STEPS;

          // Which chromatic positions are sharp (black key)
          const SHARPS = new Set([1, 3, 6, 8, 10]);

          const tanukiBottomPct = (tanukiOffset + 1) * stepH;
          const tanukiLeftPct = (tanukiOffset + 0.5) * stepW;
          const tanukiSrc = `/tanuki_${TANUKI_POSES[tanukiPhase]}${tanukiFacing === "left" ? "_逆" : ""}.png`;

          return (
            <div style={{
              position: "relative",
              width: "100%",
              height: "190px",
              marginTop: "8px",
              marginBottom: "20px",
              overflow: "visible",
            }}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="whiteKeyGrad" x1="0" y1="0%" x2="0" y2="100%">
                    <stop offset="0%"  stopColor="rgba(245,228,180,0.22)" />
                    <stop offset="100%" stopColor="rgba(210,175,100,0.10)" />
                  </linearGradient>
                  <linearGradient id="blackKeyGrad" x1="0" y1="0%" x2="0" y2="100%">
                    <stop offset="0%"  stopColor="rgba(30,25,15,0.85)" />
                    <stop offset="100%" stopColor="rgba(15,12,5,0.95)" />
                  </linearGradient>
                  <linearGradient id="activeKeyGrad" x1="0" y1="0%" x2="0" y2="100%">
                    <stop offset="0%"  stopColor="rgba(255,230,140,0.85)" />
                    <stop offset="100%" stopColor="rgba(220,165,60,0.70)" />
                  </linearGradient>
                </defs>

                {Array.from({ length: NUM_STEPS }, (_, i) => {
                  const noteIdx = (startNote + i) % 12;
                  const isSharp = SHARPS.has(noteIdx);
                  const isActive = isPlaying && i === tanukiOffset;
                  const xL = i * stepW;
                  const yT = 100 - (i + 1) * stepH;
                  const yB = 100;
                  // Each step: left edge to right edge, top to bottom (staircase shape)
                  // Step i occupies: x[xL..xL+stepW], y[yT..100]
                  const fill = isActive
                    ? "url(#activeKeyGrad)"
                    : isSharp
                      ? "url(#blackKeyGrad)"
                      : "url(#whiteKeyGrad)";
                  const stroke = isActive
                    ? "rgba(255,220,100,0.9)"
                    : isSharp
                      ? "rgba(80,65,30,0.5)"
                      : "rgba(200,160,80,0.35)";
                  // Draw each step as a polygon (staircase slice)
                  const pts = [
                    `${xL},${yB}`,
                    `${xL},${yT}`,
                    `${xL + stepW},${yT}`,
                    `${xL + stepW},${yB}`,
                  ].join(" ");
                  return (
                    <polygon
                      key={i}
                      points={pts}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth="0.5"
                      vectorEffect="non-scaling-stroke"
                      style={{
                        transition: "fill 0.18s, stroke 0.18s",
                        filter: isSharp && !isActive ? "brightness(0.7)" : "none",
                      }}
                    />
                  );
                })}

                {/* Glow shadow under active step */}
                {isPlaying && (
                  <ellipse
                    cx={tanukiLeftPct}
                    cy={100 - tanukiOffset * stepH}
                    rx={stepW * 0.45}
                    ry={stepH * 0.22}
                    fill="rgba(255,217,100,0.45)"
                    style={{ filter: "blur(2px)", transition: "cx 0.26s cubic-bezier(0.33,1,0.68,1), cy 0.26s cubic-bezier(0.33,1,0.68,1)" }}
                  />
                )}
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: `${tanukiLeftPct}%`,
                  bottom: `${tanukiBottomPct}%`,
                  transform: "translateX(-50%)",
                  width: "62px",
                  transition: "left 0.26s cubic-bezier(0.33,1,0.68,1), bottom 0.26s cubic-bezier(0.33,1,0.68,1)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                <img
                  src={tanukiSrc}
                  alt="マスコットキャラ"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.55))",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitUserDrag: "none",
                    transformOrigin: "50% 100%",
                    animation: tanukiPhase === "idle" && isPlaying
                      ? `tanukiSway ${(60 / bpm) * 2}s ease-in-out infinite`
                      : "none",
                  }}
                  draggable={false}
                />
              </div>
            </div>
          );
        })()}

        {/* ── Play button ── */}
        <div style={{ paddingTop: "8px", textAlign: "center" }}>

          <div style={{ display: "inline-block", position: "relative" }}>
            {pressed && (
              <div style={{ position: "absolute", inset: "0", borderRadius: "50%", border: `2px solid ${isPlaying ? "rgba(255,150,140,0.6)" : "rgba(240,200,132,0.6)"}`, animation: "ringRipple 0.5s ease-out forwards", pointerEvents: "none" }} />
            )}
            {isPlaying && (
              <div
                key={tickPulse}
                style={{
                  position: "absolute", inset: "-2px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,200,180,0.55)",
                  animation: `tickPulseAnim ${Math.min(0.42, 60 / bpm * 0.7)}s ease-out forwards`,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            )}
            <button className="play-btn" onClick={handlePress} style={{ position: "relative", width: "132px", height: "132px", borderRadius: "50%", border: `1px solid ${isPlaying ? "rgba(255,180,170,0.4)" : "rgba(255,220,160,0.35)"}`, background: isPlaying ? "radial-gradient(ellipse at 30% 25%, rgba(255,200,180,0.45) 0%, transparent 55%), linear-gradient(165deg, #e25040 0%, #b03020 50%, #802010 100%)" : "radial-gradient(ellipse at 30% 25%, rgba(255,235,190,0.55) 0%, transparent 55%), linear-gradient(165deg, #f8d090 0%, #d49642 50%, #a07018 100%)", color: "#1c1208", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", animation: !isPlaying && !pressed ? "idleBreath 2.8s ease-in-out infinite" : "none", boxShadow: pressed ? (isPlaying ? "inset 0 4px 12px rgba(0,0,0,0.5),0 2px 8px rgba(192,57,43,0.3)" : "inset 0 4px 12px rgba(0,0,0,0.4),0 2px 8px rgba(232,184,109,0.25)") : isPlaying ? "inset 0 1px 2px rgba(255,255,255,0.3),inset 0 -3px 8px rgba(0,0,0,0.35),0 10px 38px rgba(192,57,43,0.55),0 0 0 1px rgba(0,0,0,0.5)" : "inset 0 1px 2px rgba(255,255,255,0.45),inset 0 -3px 10px rgba(0,0,0,0.3),0 12px 42px rgba(232,184,109,0.45),0 0 0 1px rgba(0,0,0,0.5)", cursor: isLoading ? "default" : "pointer", opacity: isLoading ? 0.55 : 1, transition: pressed ? "transform 0.1s ease,box-shadow 0.1s ease" : "all 0.3s ease", transform: pressed ? "scale(0.93) translateY(2px)" : "scale(1) translateY(0)" }}>
              {isLoading ? (
                <div style={{ width: "28px", height: "28px", border: "2px solid rgba(28,18,8,0.3)", borderTop: "2px solid #1c1208", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              ) : isPlaying ? (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="6" y="6" width="24" height="24" rx="3" fill="#1c0808" /></svg>
              ) : (
                <svg width="42" height="46" viewBox="0 0 42 46" fill="none"><path d="M7 4 L36 23 L7 42 Z" fill="#1c1208" strokeLinejoin="round" strokeWidth="2" stroke="#1c1208" /></svg>
              )}
            </button>
          </div>
          <div style={{ marginTop: "22px", fontSize: "11px", color: "#6a7590", letterSpacing: "0.32em", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, textTransform: "uppercase" }}>
            {isPlaying ? t.tapToStop : t.tapToBegin}
          </div>
        </div>

    </div>
  );
}