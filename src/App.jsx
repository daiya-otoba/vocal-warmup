import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";

// ═══════════════════════════════════════════════════════════════
// i18n
// ═══════════════════════════════════════════════════════════════
const T = {
  ja: {
    etude: "ÉTUDE  ·  N°1",
    tapToStop: "タップして停止",
    tapToBegin: "タップして開始",
    loadingSamples: "音源を読み込み中…",
    done: "✓ 完了",
    keyProgress: (s, t) => `Key ${s} / ${t}`,
    mode: "モード",
    pattern: "パターン",
    direction: "移調方向",
    tempo: (bpm) => `テンポ  ·  ${bpm} BPM`,
    volume: "音量",
    startNote: "開始音",
    major: "メジャー", majorSub: "Major",
    minor: "マイナー", minorSub: "Minor",
    up: "上行", down: "下行", updown: "往復",
    eachKey: "♩ 各キーに和音",
    firstKey: "♩ 最初のキーのみ和音",
    mute: "MUTE",
    piano: "ピアノ", click: "クリック",
    octave: "オクターブ",
    lento: "ゆっくり", presto: "速く",
    iconLabel: "アイコン変更",
    audioInitFail: "音声起動失敗: ",
    sampleLoadFail: "音源の読み込みに失敗しました",
    playError: "再生エラー: ",
    emptyPattern: (n, m) => `パターンが空です (${n} / ${m})`,
    langToggle: "EN",
  },
  en: {
    etude: "ÉTUDE  ·  N°1",
    tapToStop: "tap to stop",
    tapToBegin: "tap to begin",
    loadingSamples: "Loading samples…",
    done: "✓ Done",
    keyProgress: (s, t) => `Key ${s} / ${t}`,
    mode: "Mode",
    pattern: "Pattern",
    direction: "Direction",
    tempo: (bpm) => `Tempo  ·  ${bpm} BPM`,
    volume: "Volume",
    startNote: "Start Note",
    major: "Major", majorSub: "メジャー",
    minor: "Minor", minorSub: "マイナー",
    up: "Ascending", down: "Descending", updown: "Round-trip",
    eachKey: "♩ Chord on each key",
    firstKey: "♩ Chord on first key only",
    mute: "MUTE",
    piano: "Piano", click: "Click",
    octave: "Octave",
    lento: "lento", presto: "presto",
    iconLabel: "Change icon",
    audioInitFail: "Audio init failed: ",
    sampleLoadFail: "Failed to load samples",
    playError: "Playback error: ",
    emptyPattern: (n, m) => `Empty pattern (${n} / ${m})`,
    langToggle: "日本語",
  },
};

// ═══════════════════════════════════════════════════════════════
// Notes
// ═══════════════════════════════════════════════════════════════
const NOTES = [
  { idx: 0,  ja: "ド",    en: "C",  sharp: false },
  { idx: 1,  ja: "ド♯",  en: "C#", sharp: true  },
  { idx: 2,  ja: "レ",    en: "D",  sharp: false },
  { idx: 3,  ja: "レ♯",  en: "D#", sharp: true  },
  { idx: 4,  ja: "ミ",    en: "E",  sharp: false },
  { idx: 5,  ja: "ファ",  en: "F",  sharp: false },
  { idx: 6,  ja: "ファ♯", en: "F#", sharp: true  },
  { idx: 7,  ja: "ソ",    en: "G",  sharp: false },
  { idx: 8,  ja: "ソ♯",  en: "G#", sharp: true  },
  { idx: 9,  ja: "ラ",    en: "A",  sharp: false },
  { idx: 10, ja: "ラ♯",  en: "A#", sharp: true  },
  { idx: 11, ja: "シ",    en: "B",  sharp: false },
];

// ═══════════════════════════════════════════════════════════════
// Scale helpers
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// Scales (bilingual)
// ═══════════════════════════════════════════════════════════════
const SCALES = [
  {
    nameJa: "5度スケール", nameEn: "Fifth Scale",
    group: "each",
    majorDescJa: "ド・レ・ミ・ファ・ソ・ファ・ミ・レ・ド",
    majorDescEn: "C · D · E · F · G · F · E · D · C",
    minorDescJa: "ド・レ・ミ♭・ファ・ソ・ファ・ミ♭・レ・ド",
    minorDescEn: "C · D · E♭ · F · G · F · E♭ · D · C",
    major: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    minor: [0, 2, 3, 5, 7, 5, 3, 2, 0],
  },
  {
    nameJa: "7thアルペジオ", nameEn: "7th Arpeggio",
    group: "each",
    majorDescJa: "ド・ミ・ソ・シ・ド・シ・ソ・ミ・ド",
    majorDescEn: "C · E · G · B · C · B · G · E · C",
    minorDescJa: "ド・ミ♭・ソ・シ♭・ド・シ♭・ソ・ミ♭・ド",
    minorDescEn: "C · E♭ · G · B♭ · C · B♭ · G · E♭ · C",
    major: [0, 4, 7, 11, 12, 11, 7, 4, 0],
    minor: [0, 3, 7, 10, 12, 10, 7, 3, 0],
  },
  {
    nameJa: "3和音アルペジオ", nameEn: "Triad Arpeggio",
    group: "each",
    majorDescJa: "ド・ミ・ソ・ド・ソ・ミ・ド",
    majorDescEn: "C · E · G · C · G · E · C",
    minorDescJa: "ド・ミ♭・ソ・ド・ソ・ミ♭・ド",
    minorDescEn: "C · E♭ · G · C · G · E♭ · C",
    major: [0, 4, 7, 12, 7, 4, 0],
    minor: [0, 3, 7, 12, 7, 3, 0],
  },
  {
    nameJa: "全音階", nameEn: "Diatonic Scale",
    group: "each",
    majorDescJa: "ド・レ・ミ・ファ・ソ・ラ・シ・ド",
    majorDescEn: "C · D · E · F · G · A · B · C",
    minorDescJa: "ド・レ・ミ♭・ファ・ソ・ラ♭・シ♭・ド",
    minorDescEn: "C · D · E♭ · F · G · A♭ · B♭ · C",
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
  },
  {
    nameJa: "クロマチック（ド〜ミ往復）", nameEn: "Chromatic (to E & back)",
    group: "each",
    majorDescJa: "ド〜ミまで半音ずつ上がって戻る",
    majorDescEn: "Semitones up to E, then back",
    minorDescJa: "ド〜ミ♭まで半音ずつ上がって戻る",
    minorDescEn: "Semitones up to E♭, then back",
    major: [0, 1, 2, 3, 4, 3, 2, 1, 0],
    minor: [0, 1, 2, 3, 2, 1, 0],
  },
  {
    nameJa: "3度往復スケール", nameEn: "3rd Interval Scale",
    group: "first",
    majorDescJa: "ド ミ・レ ファ・ミ ソ… 3度往復で上下行",
    majorDescEn: "C–E · D–F · E–G… thirds, asc & desc",
    minorDescJa: "ド ミ♭・レ ファ・ミ♭ ソ… 3度往復で上下行",
    minorDescEn: "C–E♭ · D–F · E♭–G… thirds, asc & desc",
    majorParts: buildIntervalScale(MAJ7, 2),
    minorParts: buildIntervalScale(MIN7, 2),
  },
  {
    nameJa: "4度往復スケール", nameEn: "4th Interval Scale",
    group: "first",
    majorDescJa: "ド ファ・レ ソ・ミ ラ… 4度往復で上下行",
    majorDescEn: "C–F · D–G · E–A… fourths, asc & desc",
    minorDescJa: "ド ファ・レ ソ・ミ♭ ラ♭… 4度往復で上下行",
    minorDescEn: "C–F · D–G · E♭–A♭… fourths, asc & desc",
    majorParts: buildIntervalScale(MAJ7, 3),
    minorParts: buildIntervalScale(MIN7, 3),
  },
  {
    nameJa: "5度往復スケール", nameEn: "5th Interval Scale",
    group: "first",
    majorDescJa: "ド ソ・レ ラ・ミ シ… 5度往復で上下行",
    majorDescEn: "C–G · D–A · E–B… fifths, asc & desc",
    minorDescJa: "ド ソ・レ ラ♭・ミ♭ シ♭… 5度往復で上下行",
    minorDescEn: "C–G · D–A♭ · E♭–B♭… fifths, asc & desc",
    majorParts: buildIntervalScale(MAJ7, 4),
    minorParts: buildIntervalScale(MIN7, 4),
  },
  {
    nameJa: "6度往復スケール", nameEn: "6th Interval Scale",
    group: "first",
    majorDescJa: "ド ラ・レ シ・ミ ド… 6度往復で上下行",
    majorDescEn: "C–A · D–B · E–C… sixths, asc & desc",
    minorDescJa: "ド ラ♭・レ シ♭・ミ♭ ド… 6度往復で上下行",
    minorDescEn: "C–A♭ · D–B♭ · E♭–C… sixths, asc & desc",
    majorParts: buildIntervalScale(MAJ7, 5),
    minorParts: buildIntervalScale(MIN7, 5),
  },
];

// ═══════════════════════════════════════════════════════════════
// Audio helpers
// ═══════════════════════════════════════════════════════════════
const pctToDb = (pct) => {
  if (pct <= 0) return -Infinity;
  return -30 + (pct / 100) * 30;
};

// Salamander Grand Piano (real piano recordings)
const SALAMANDER_URLS = {
  A0: "A0.mp3", C1: "C1.mp3", Ds1: "Ds1.mp3", Fs1: "Fs1.mp3",
  A1: "A1.mp3", C2: "C2.mp3", Ds2: "Ds2.mp3", Fs2: "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", Ds3: "Ds3.mp3", Fs3: "Fs3.mp3",
  A3: "A3.mp3", C4: "C4.mp3", Ds4: "Ds4.mp3", Fs4: "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", Ds5: "Ds5.mp3", Fs5: "Fs5.mp3",
  A5: "A5.mp3", C6: "C6.mp3", Ds6: "Ds6.mp3", Fs6: "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", Ds7: "Ds7.mp3", Fs7: "Fs7.mp3",
  A7: "A7.mp3", C8: "C8.mp3",
};
const SALAMANDER_BASE = "https://tonejs.github.io/audio/salamander/";

// Icon options
const ICONS = ["🎵", "🎤", "🎹", "🎶", "🎼", "🎧", "🌸", "✨", "🎀", "🌙", "⭐", "🦋"];

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════════
export default function VocalApp() {
  const [lang, setLang] = useState("ja");
  const [appIcon, setAppIcon] = useState("🎵");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [mode, setMode] = useState("major");
  const [scaleIdx, setScaleIdx] = useState(0);
  const [direction, setDirection] = useState("up");
  const [bpm, setBpm] = useState(112);
  const [startNote, setStartNote] = useState(0);
  const [octave, setOctave] = useState(4);
  const [pianoVolPct, setPianoVolPct] = useState(70);
  const [clickVolPct, setClickVolPct] = useState(40);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(null);
  const [stepNum, setStepNum] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const [samplerLoading, setSamplerLoading] = useState(false);
  const [pressed, setPressed] = useState(false);

  const t = T[lang];

  // Audio refs — chord & melody use separate samplers to avoid note-collision
  const chordSamplerRef = useRef(null);
  const melodySamplerRef = useRef(null);
  const chordNotesRef = useRef([]);
  const clickRef = useRef(null);
  const pianoVolRef = useRef(null);
  const clickVolRef = useRef(null);
  const reverbRef = useRef(null);
  const filterRef = useRef(null);
  const playingRef = useRef(false);
  const timeoutsRef = useRef([]);
  const pianoVolPctRef = useRef(70);
  const clickVolPctRef = useRef(40);

  // i18n helpers
  const sName = (s) => lang === "ja" ? s.nameJa : s.nameEn;
  const sDesc = (s) => {
    if (mode === "major") return lang === "ja" ? s.majorDescJa : s.majorDescEn;
    return lang === "ja" ? s.minorDescJa : s.minorDescEn;
  };
  const noteLabel = (n) => lang === "ja" ? n.ja : n.en;
  const noteAlt   = (n) => lang === "ja" ? n.en : n.ja;

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

  const initAudio = async () => {
    if (audioReady || samplerLoading) return;
    setSamplerLoading(true);
    setErrorMsg("");

    try {
      await Tone.start();
      const ctx = Tone.getContext();
      if (ctx.state !== "running") await ctx.resume();
    } catch (e) {
      setSamplerLoading(false);
      throw new Error(t.audioInitFail + e.message);
    }

    const pianoVol = new Tone.Volume(pctToDb(pianoVolPctRef.current)).toDestination();
    pianoVolRef.current = pianoVol;
    const clickVol = new Tone.Volume(pctToDb(clickVolPctRef.current)).toDestination();
    clickVolRef.current = clickVol;

    // Richer reverb for real piano samples
    const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.22 }).connect(pianoVol);
    await reverb.generate();
    reverbRef.current = reverb;

    const filter = new Tone.Filter({ type: "lowpass", frequency: 8000, rolloff: -12 }).connect(reverb);
    filterRef.current = filter;

    try {
      // Chord sampler — sustained, slightly softer velocity
      const chordSampler = new Tone.Sampler({
        urls: SALAMANDER_URLS,
        release: 2.5,
        baseUrl: SALAMANDER_BASE,
      }).connect(filter);

      // Melody sampler — brighter velocity, shorter release
      const melodySampler = new Tone.Sampler({
        urls: SALAMANDER_URLS,
        release: 1.5,
        baseUrl: SALAMANDER_BASE,
      }).connect(filter);

      // Wait for all audio files to buffer
      await Tone.loaded();

      chordSamplerRef.current = chordSampler;
      melodySamplerRef.current = melodySampler;
    } catch (e) {
      setSamplerLoading(false);
      throw new Error(t.sampleLoadFail);
    }

    const click = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
    }).connect(clickVol);
    clickRef.current = click;

    setSamplerLoading(false);
    setAudioReady(true);
  };

  const releaseChord = () => {
    if (chordSamplerRef.current && chordNotesRef.current?.length) {
      try { chordSamplerRef.current.triggerRelease(chordNotesRef.current); } catch (e) {}
      chordNotesRef.current = [];
    }
  };

  const stopAll = () => {
    playingRef.current = false;
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    releaseChord();
    try { melodySamplerRef.current?.releaseAll(); } catch (e) {}
    setIsPlaying(false);
    setCurrentOffset(null);
    setStepNum(0);
  };

  const tickClick = () => {
    if (!clickRef.current || clickVolPctRef.current <= 0) return;
    try { clickRef.current.triggerAttackRelease("C6", 0.018); } catch (e) {}
  };

  const handlePress = async () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    if (isPlaying) { stopAll(); return; }
    setErrorMsg("");
    try { await initAudio(); } catch (e) { setErrorMsg(e.message); return; }

    playingRef.current = true;
    setIsPlaying(true);
    setDone(false);
    setStepNum(0);

    const scale = SCALES[scaleIdx];
    const isFirstOnly = scale.group === "first";
    const parts = isFirstOnly ? scale[mode + "Parts"] : null;
    const pattern = isFirstOnly ? null : scale[mode];

    if (!isFirstOnly && (!Array.isArray(pattern) || pattern.length === 0)) {
      setErrorMsg(t.emptyPattern(sName(scale), mode));
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    if (isFirstOnly && !parts) {
      setErrorMsg(t.emptyPattern(sName(scale), mode));
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }

    const secs = 60 / bpm;
    const beatMs = secs * 1000;
    const baseMidi = (octave + 1) * 12 + startNote;

    const up13 = Array.from({ length: 13 }, (_, i) => i);
    const dn13 = Array.from({ length: 13 }, (_, i) => 12 - i);
    const updown = [...up13, ...Array.from({ length: 12 }, (_, i) => 11 - i)];
    const offsets = direction === "up" ? up13 : direction === "down" ? dn13 : updown;
    setTotalSteps(offsets.length);

    const midiToNote = (m) => Tone.Frequency(m, "midi").toNote();

    let keyMidi = 0;

    const playNotes = async (semis) => {
      for (const semi of semis) {
        if (!playingRef.current) return false;
        tickClick();
        melodySamplerRef.current.triggerAttackRelease(
          midiToNote(keyMidi + semi), secs * 0.85, Tone.now(), 0.85
        );
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

        if (oi > 0) {
          releaseChord();
          try { melodySamplerRef.current?.releaseAll(); } catch (e) {}
        }

        setCurrentOffset(offset);
        setStepNum(oi + 1);

        const playChordHere = !isFirstOnly || oi === 0;

        if (playChordHere) {
          // Beat 1: chord attack (velocity 0.5 = warm, not harsh)
          tickClick();
          chordNotesRef.current = chordNotes;
          chordSamplerRef.current.triggerAttack(chordNotes, Tone.now(), 0.5);
          await sleep(beatMs);
          if (!playingRef.current) break;
          // Beat 2: preparation rest
          tickClick();
          await sleep(beatMs);
          if (!playingRef.current) break;
          releaseChord();
        } else {
          tickClick();
          await sleep(beatMs);
          if (!playingRef.current) break;
        }

        if (isFirstOnly && parts) {
          if (!await playNotes(parts.asc)) break;
          if (!playingRef.current) break;

          // Top note hold
          tickClick();
          melodySamplerRef.current.triggerAttackRelease(
            midiToNote(keyMidi + parts.top), secs * 0.92, Tone.now(), 0.9
          );
          await sleep(beatMs);
          if (!playingRef.current) break;
          try { melodySamplerRef.current?.releaseAll(); } catch (e) {}
          tickClick();
          await sleep(beatMs);
          if (!playingRef.current) break;

          if (!await playNotes(parts.desc)) break;
        } else {
          for (const semi of pattern) {
            if (!playingRef.current) break;
            tickClick();
            melodySamplerRef.current.triggerAttackRelease(
              midiToNote(keyMidi + semi), secs * 0.85, Tone.now(), 0.85
            );
            await sleep(beatMs);
          }
        }
        if (!playingRef.current) break;

        try { melodySamplerRef.current?.releaseAll(); } catch (e) {}
        tickClick();
        await sleep(beatMs);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg(t.playError + e.message);
    }

    releaseChord();
    try { melodySamplerRef.current?.releaseAll(); } catch (e) {}

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
    try { chordSamplerRef.current?.dispose(); } catch (e) {}
    try { melodySamplerRef.current?.dispose(); } catch (e) {}
    try { clickRef.current?.dispose(); } catch (e) {}
    try { reverbRef.current?.dispose(); } catch (e) {}
    try { filterRef.current?.dispose(); } catch (e) {}
    try { pianoVolRef.current?.dispose(); } catch (e) {}
    try { clickVolRef.current?.dispose(); } catch (e) {}
  }, []);

  const curNote = currentOffset !== null ? NOTES[(startNote + currentOffset) % 12] : null;
  const progress = totalSteps > 0 ? (stepNum / totalSteps) * 100 : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #050710; overscroll-behavior: none; }
        @keyframes pop { from { opacity:0; transform:scale(0.55); } to { opacity:1; transform:scale(1); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 22px rgba(232,184,109,0.35),0 0 50px rgba(232,184,109,0.15); } 50% { box-shadow:0 0 36px rgba(232,184,109,0.6),0 0 70px rgba(232,184,109,0.32); } }
        @keyframes ghostPulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:0.8; transform:scale(1.04); } }
        @keyframes ringRipple { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(1.7); opacity:0; } }
        @keyframes idleBreath { 0%,100% { box-shadow:inset 0 1px 2px rgba(255,255,255,0.4),inset 0 -3px 8px rgba(0,0,0,0.25),0 12px 38px rgba(232,184,109,0.4),0 0 0 0 rgba(232,184,109,0.3); } 50% { box-shadow:inset 0 1px 2px rgba(255,255,255,0.4),inset 0 -3px 8px rgba(0,0,0,0.25),0 12px 42px rgba(232,184,109,0.5),0 0 0 8px rgba(232,184,109,0.05); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes iconPickerIn { from { opacity:0; transform:translateY(-6px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        input[type=range] { -webkit-appearance:none; appearance:none; height:6px; border-radius:3px; background:#1f2334; outline:none; width:100%; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:24px; height:24px; border-radius:50%; background:linear-gradient(145deg,#f0c884,#c9943a); cursor:pointer; box-shadow:0 2px 10px rgba(232,184,109,0.5),inset 0 1px 1px rgba(255,255,255,0.3); }
        input[type=range]::-moz-range-thumb { width:24px; height:24px; border:none; border-radius:50%; background:linear-gradient(145deg,#f0c884,#c9943a); cursor:pointer; }
        .play-btn { -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none; }
        button { -webkit-tap-highlight-color:transparent; }
      `}</style>

      <div style={{
        fontFamily: "'Zen Kaku Gothic New', sans-serif",
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, rgba(232,184,109,0.05) 0%, transparent 55%), linear-gradient(170deg, #050710 0%, #0a0e1c 50%, #050710 100%)",
        color: "#e6e2d6",
        maxWidth: "480px",
        margin: "0 auto",
        padding: "0 18px 56px",
      }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", padding: "32px 0 22px", position: "relative" }}>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "ja" ? "en" : "ja")}
            style={{
              position: "absolute", top: "34px", right: "0",
              padding: "5px 13px", borderRadius: "20px",
              border: "1px solid #2a3040",
              background: "rgba(255,255,255,0.03)",
              color: "#7a8598", fontSize: "11px",
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic", fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.08em",
              transition: "all 0.2s",
            }}
          >
            {t.langToggle}
          </button>

          <div style={{ fontSize: "11px", letterSpacing: "0.42em", color: "#5a6478", marginBottom: "10px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
            {t.etude}
          </div>

          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px" }}>
            <button
              onClick={() => !isPlaying && setShowIconPicker(!showIconPicker)}
              title={t.iconLabel}
              style={{
                fontSize: "32px", background: "none", border: "none",
                cursor: isPlaying ? "default" : "pointer",
                lineHeight: 1, padding: "4px",
                opacity: isPlaying ? 0.5 : 1,
                transition: "transform 0.18s",
                transform: showIconPicker ? "scale(1.2) rotate(-8deg)" : "scale(1)",
                borderRadius: "10px",
              }}
            >
              {appIcon}
            </button>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "44px", fontStyle: "italic", fontWeight: 600, color: "#f0c884", lineHeight: 1.05, textShadow: "0 0 30px rgba(232,184,109,0.25)" }}>
              Vocal Warm-Up
            </div>
          </div>

          {/* Icon picker */}
          {showIconPicker && (
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center",
              gap: "8px", marginTop: "14px", padding: "14px 10px",
              background: "rgba(10,14,28,0.95)", borderRadius: "16px",
              border: "1px solid #1f2a3c",
              animation: "iconPickerIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              backdropFilter: "blur(8px)",
            }}>
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => { setAppIcon(ic); setShowIconPicker(false); }}
                  style={{
                    fontSize: "26px",
                    background: appIcon === ic ? "rgba(232,184,109,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${appIcon === ic ? "#f0c884" : "transparent"}`,
                    borderRadius: "10px", padding: "6px 8px", cursor: "pointer",
                    transition: "all 0.15s",
                    transform: appIcon === ic ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
            <div style={{ height: "1px", width: "36px", background: "linear-gradient(90deg, transparent, #4a5570)" }} />
            <div style={{ fontSize: "10px", color: "#5a6478", letterSpacing: "0.3em" }}>♩ ♪ ♩</div>
            <div style={{ height: "1px", width: "36px", background: "linear-gradient(90deg, #4a5570, transparent)" }} />
          </div>
        </div>

        {/* ── Status ── */}
        <div style={{ height: "138px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
          {samplerLoading ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", display: "inline-block", animation: "spin 1.4s linear infinite", marginBottom: "10px", color: "rgba(232,184,109,0.5)" }}>♪</div>
              <div style={{ fontSize: "12px", color: "#7a8598", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.05em" }}>{t.loadingSamples}</div>
            </div>
          ) : curNote ? (
            <div style={{ textAlign: "center", animation: "pop 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <div style={{ fontSize: "11px", color: "#7a8598", letterSpacing: "0.22em", marginBottom: "10px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600 }}>
                {t.keyProgress(stepNum, totalSteps)}
              </div>
              <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "radial-gradient(ellipse at 30% 25%, rgba(255,235,190,0.55) 0%, transparent 55%), linear-gradient(165deg, #f4cd8c 0%, #d49642 50%, #a87520 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "glow 1.4s ease-in-out infinite", margin: "0 auto", border: "1px solid rgba(255,220,160,0.3)" }}>
                <span style={{ fontSize: "30px", fontWeight: "900", color: "#1c1208", lineHeight: 1, fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                  {noteLabel(curNote)}
                </span>
                <span style={{ fontSize: "12px", color: "#1c1208", opacity: 0.6, marginTop: "3px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.05em", fontWeight: 600 }}>
                  {noteAlt(curNote)}
                </span>
              </div>
            </div>
          ) : done ? (
            <div style={{ fontSize: "18px", color: "#f0c884", animation: "pop 0.3s ease", padding: "14px 32px", border: "1px solid rgba(232,184,109,0.3)", borderRadius: "30px", background: "rgba(232,184,109,0.06)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "0.05em" }}>
              {t.done}
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

        {/* ── Mode ── */}
        <Section label={t.mode}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { val: "major", label: t.major, sub: t.majorSub },
              { val: "minor", label: t.minor, sub: t.minorSub },
            ].map((m) => (
              <button key={m.val} onClick={() => !isPlaying && setMode(m.val)} style={{ flex: 1, padding: "14px 10px", textAlign: "center", borderRadius: "12px", border: `1.5px solid ${mode === m.val ? "#f0c884" : "#2a3040"}`, background: mode === m.val ? "rgba(232,184,109,0.12)" : "rgba(255,255,255,0.025)", color: mode === m.val ? "#f0c884" : "#8a96b0", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.18s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                <div style={{ fontSize: "16px", fontWeight: mode === m.val ? "700" : "500" }}>{m.label}</div>
                <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "3px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 500 }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Pattern ── */}
        <Section label={t.pattern}>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", color: "#5a6478", letterSpacing: "0.2em", marginBottom: "8px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              {t.eachKey}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {SCALES.filter(s => s.group === "each").map((s) => {
                const i = SCALES.indexOf(s);
                return (
                  <button key={i} onClick={() => !isPlaying && setScaleIdx(i)} style={{ padding: "13px 16px", textAlign: "left", borderRadius: "12px", border: `1.5px solid ${scaleIdx === i ? "#f0c884" : "#2a3040"}`, background: scaleIdx === i ? "rgba(232,184,109,0.1)" : "rgba(255,255,255,0.025)", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.18s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: scaleIdx === i ? "#f0c884" : "#b0bcd0" }}>{sName(s)}</div>
                    <div style={{ fontSize: "11px", color: scaleIdx === i ? "#9aa6c0" : "#6a7590", marginTop: "4px", fontWeight: 500 }}>{sDesc(s)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", color: "#5a6478", letterSpacing: "0.2em", marginBottom: "8px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              {t.firstKey}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {SCALES.filter(s => s.group === "first").map((s) => {
                const i = SCALES.indexOf(s);
                return (
                  <button key={i} onClick={() => !isPlaying && setScaleIdx(i)} style={{ padding: "13px 16px", textAlign: "left", borderRadius: "12px", border: `1.5px solid ${scaleIdx === i ? "#7eafff" : "#2a3040"}`, background: scaleIdx === i ? "rgba(126,175,255,0.1)" : "rgba(255,255,255,0.025)", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.18s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: scaleIdx === i ? "#7eafff" : "#b0bcd0" }}>{sName(s)}</div>
                    <div style={{ fontSize: "11px", color: scaleIdx === i ? "#8aa8e0" : "#6a7590", marginTop: "4px", fontWeight: 500 }}>{sDesc(s)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Direction ── */}
        <Section label={t.direction}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { val: "up", label: t.up, icon: "↑" },
              { val: "down", label: t.down, icon: "↓" },
              { val: "updown", label: t.updown, icon: "⇅" },
            ].map((d) => (
              <button key={d.val} onClick={() => !isPlaying && setDirection(d.val)} style={{ flex: 1, padding: "14px 6px", textAlign: "center", borderRadius: "12px", border: `1.5px solid ${direction === d.val ? "#7eafff" : "#2a3040"}`, background: direction === d.val ? "rgba(126,175,255,0.12)" : "rgba(255,255,255,0.025)", color: direction === d.val ? "#7eafff" : "#8a96b0", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.18s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                <div style={{ fontSize: "24px", lineHeight: 1 }}>{d.icon}</div>
                <div style={{ fontSize: "13px", marginTop: "6px", fontWeight: direction === d.val ? "700" : "500" }}>{d.label}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Tempo ── */}
        <Section label={t.tempo(bpm)}>
          <input type="range" min="40" max="200" value={bpm} onChange={(e) => !isPlaying && setBpm(+e.target.value)} disabled={isPlaying} style={{ opacity: isPlaying ? 0.4 : 1 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#5a6478", marginTop: "10px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 500, letterSpacing: "0.05em" }}>
            <span>40 · {t.lento}</span><span>120</span><span>{t.presto} · 200</span>
          </div>
        </Section>

        {/* ── Volume ── */}
        <Section label={t.volume}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: t.piano, icon: "♪", color: "#f0c884", val: pianoVolPct, set: setPianoVolPct },
              { label: t.click, icon: "♩", color: "#7eafff", val: clickVolPct, set: setClickVolPct },
            ].map(({ label, icon, color, val, set }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#b0bcd0", fontWeight: 600 }}>
                    <span style={{ color, marginRight: "8px" }}>{icon}</span>{label}
                  </span>
                  <span style={{ fontSize: "12px", color: val === 0 ? "#5a6478" : "#7a8598", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, letterSpacing: val === 0 ? "0.15em" : 0 }}>
                    {val === 0 ? t.mute : `${val}%`}
                  </span>
                </div>
                <input type="range" min="0" max="100" value={val} onChange={(e) => set(+e.target.value)} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Start Note ── */}
        <Section label={t.startNote}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "7px", marginBottom: "16px" }}>
            {NOTES.map((n) => (
              <button key={n.idx} onClick={() => !isPlaying && setStartNote(n.idx)} style={{ padding: "10px 3px", borderRadius: "10px", border: `1.5px solid ${startNote === n.idx ? "#f0c884" : n.sharp ? "#1a1f2e" : "#2a3040"}`, background: startNote === n.idx ? "rgba(232,184,109,0.2)" : n.sharp ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.035)", color: startNote === n.idx ? "#f0c884" : n.sharp ? "#6a7590" : "#b0bcd0", fontSize: "13px", fontWeight: startNote === n.idx ? "700" : "500", textAlign: "center", cursor: isPlaying ? "default" : "pointer", opacity: isPlaying ? 0.45 : 1, transition: "all 0.15s", fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
                <div>{noteLabel(n)}</div>
                <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "2px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600 }}>
                  {noteAlt(n)}
                </div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", color: "#7a8598", letterSpacing: "0.2em", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, textTransform: "uppercase" }}>
              {t.octave}
            </span>
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

        {/* ── Play button ── */}
        <div style={{ paddingTop: "28px", textAlign: "center" }}>
          <div style={{ display: "inline-block", position: "relative" }}>
            {pressed && (
              <div style={{ position: "absolute", inset: "0", borderRadius: "50%", border: `2px solid ${isPlaying ? "rgba(255,150,140,0.6)" : "rgba(240,200,132,0.6)"}`, animation: "ringRipple 0.5s ease-out forwards", pointerEvents: "none" }} />
            )}
            <button className="play-btn" onClick={handlePress} style={{ position: "relative", width: "132px", height: "132px", borderRadius: "50%", border: `1px solid ${isPlaying ? "rgba(255,180,170,0.4)" : "rgba(255,220,160,0.35)"}`, background: isPlaying ? "radial-gradient(ellipse at 30% 25%, rgba(255,200,180,0.45) 0%, transparent 55%), linear-gradient(165deg, #e25040 0%, #b03020 50%, #802010 100%)" : "radial-gradient(ellipse at 30% 25%, rgba(255,235,190,0.55) 0%, transparent 55%), linear-gradient(165deg, #f8d090 0%, #d49642 50%, #a07018 100%)", color: "#1c1208", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", animation: !isPlaying && !pressed ? "idleBreath 2.8s ease-in-out infinite" : "none", boxShadow: pressed ? (isPlaying ? "inset 0 4px 12px rgba(0,0,0,0.5),0 2px 8px rgba(192,57,43,0.3)" : "inset 0 4px 12px rgba(0,0,0,0.4),0 2px 8px rgba(232,184,109,0.25)") : isPlaying ? "inset 0 1px 2px rgba(255,255,255,0.3),inset 0 -3px 8px rgba(0,0,0,0.35),0 10px 38px rgba(192,57,43,0.55),0 0 0 1px rgba(0,0,0,0.5)" : "inset 0 1px 2px rgba(255,255,255,0.45),inset 0 -3px 10px rgba(0,0,0,0.3),0 12px 42px rgba(232,184,109,0.45),0 0 0 1px rgba(0,0,0,0.5)", cursor: "pointer", transition: pressed ? "transform 0.1s ease,box-shadow 0.1s ease" : "all 0.3s ease", transform: pressed ? "scale(0.93) translateY(2px)" : "scale(1) translateY(0)" }}>
              {isPlaying ? (
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
    </>
  );
}