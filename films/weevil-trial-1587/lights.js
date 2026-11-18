// lights.js — Four custom 1587 St-Julien lighting & atmosphere presets:
//   vineyard  — warm Savoy summer sunlight over terraced grape rows
//   courtroom — ecclesiastical stone church court with warm amber clerestory rays & cool indigo shafts
//   wasteland — bleached rocky scrub hillside Le Grand Feisse
//   archive   — intimate golden-orange candlelit oak bishop's archive at night

export const LIGHTS = {
  vineyard: {
    az: 68, el: 44,
    lit: [1.56, 1.49, 1.32], shade: [0.29, 0.31, 0.42], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.91], charShade: 0.87, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.91, 0.91, 0.97],
    blob: [0.62, 0.58, 0.60], actorShadow: false,
    top: "#3b7cd1", hor: "#bdd4ee", fog: "#bdd4ee", fogNear: 28, fogFar: 260, sunDisc: "#000000",
    sunCol: "#fff4df", sunI: 2.8, sky: "#e2f0ff", ground: "#8da65c", hemiI: 0.58,
    bias: -0.00025, normalBias: 0.015,
  },
  courtroom: {
    az: 44, el: 34,
    lit: [1.50, 1.24, 0.96], shade: [0.18, 0.20, 0.34], lift: [0.07, 0.06, 0.12], lambert: 0.35, sideK: 0.84, term: 0.16,
    charTint: [1.0, 0.91, 0.82], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.84, 0.84, 0.95],
    blob: [0.55, 0.52, 0.62], actorShadow: false,
    top: "#29304d", hor: "#6c6a82", fog: "#6c6a82", fogNear: 18, fogFar: 130, sunDisc: "#000000",
    sunCol: "#ffe0b0", sunI: 3.1, sky: "#a8b0d0", ground: "#6f5d52", hemiI: 0.45,
    bias: -0.00025, normalBias: 0.015,
  },
  wasteland: {
    az: 24, el: 56,
    lit: [1.62, 1.42, 1.15], shade: [0.34, 0.27, 0.32], lift: [0.06, 0.05, 0.09], lambert: 0.35, sideK: 0.85, term: 0.22,
    charTint: [1.0, 0.94, 0.87], charShade: 0.87, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.92, 0.88, 0.94],
    blob: [0.64, 0.58, 0.60], actorShadow: false,
    top: "#6c8aa6", hor: "#e8d6b2", fog: "#e4d2ae", fogNear: 24, fogFar: 220, sunDisc: "#ffe4b8",
    sunCol: "#ffebc8", sunI: 3.0, sky: "#eef0e6", ground: "#b6986d", hemiI: 0.54,
    bias: -0.00025, normalBias: 0.015,
  },
  archive: {
    az: -38, el: 42,
    lit: [1.48, 1.10, 0.66], shade: [0.11, 0.10, 0.22], lift: [0.06, 0.05, 0.10], lambert: 0.34, sideK: 0.82, term: 0.14,
    charTint: [1.0, 0.89, 0.74], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.24, sideTint: [0.80, 0.78, 0.92],
    blob: [0.35, 0.30, 0.38], actorShadow: false,
    top: "#101628", hor: "#242840", fog: "#1b1d2e", fogNear: 12, fogFar: 75, sunDisc: "#000000",
    sunCol: "#ffbe70", sunI: 2.9, sky: "#42466a", ground: "#4a3324", hemiI: 0.36,
    bias: -0.00025, normalBias: 0.015,
  },
};

export const LOOK = {
  vineyard: {
    sky: { c: ["#bdd4ee", "#9ac0ea", "#699ee0", "#4f8bd9", "#3b7cd1"], e: [0, 4, 10, 20, 42] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.01, 0.02, 0.0],
    sat: 1.08,
  },
  courtroom: {
    sky: { c: ["#6c6a82", "#52526d", "#3f415d", "#30344e", "#242840"], e: [0, 5, 12, 24, 45] },
    cloud: { lit: "#9d9ab0", mid: "#73728a", shade: "#4a4b63" },
    bounce: [0.03, 0.02, 0.01],
    sat: 1.0,
  },
  wasteland: {
    sky: { c: ["#e8d6b2", "#dec9a4", "#c3b8a8", "#94a4b4", "#6c8aa6"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#fff4df", mid: "#e5d5bc", shade: "#bfa898" },
    bounce: [0.03, 0.02, 0.0],
    sat: 0.96,
  },
  archive: {
    sky: { c: ["#242840", "#1e2138", "#181c30", "#13182a", "#101628"], e: [0, 5, 12, 24, 45] },
    cloud: { lit: "#4a4e6b", mid: "#32354f", shade: "#1f2238" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.04,
  },
};
