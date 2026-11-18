// lights.js — Four custom WWII Polish II Corps lighting & atmosphere presets:
//   iran_camp       — warm golden Iranian desert sunlight over Hamadan supply camp (1942)
//   alexandria_port — crisp Mediterranean cobalt daylight at Alexandria harbour (1944)
//   monte_cassino   — dramatic artillery-lit Italian mountain sky at Monte Cassino (May 1944)
//   emblem_road     — heroic golden-hour sunshine along the Italian victory road (1944)

export const LIGHTS = {
  iran_camp: {
    az: 54, el: 48,
    lit: [1.58, 1.44, 1.20], shade: [0.32, 0.28, 0.36], lift: [0.06, 0.05, 0.09], lambert: 0.35, sideK: 0.85, term: 0.20,
    charTint: [1.0, 0.95, 0.88], charShade: 0.87, charGrad: 0.07, bodyGrad: 0.20, sideTint: [0.92, 0.89, 0.95],
    blob: [0.62, 0.56, 0.58], actorShadow: false,
    top: "#4a84cc", hor: "#ead2a8", fog: "#e6cea4", fogNear: 26, fogFar: 240, sunDisc: "#ffe6b8",
    sunCol: "#fff0d2", sunI: 2.9, sky: "#f2ebd9", ground: "#c29b64", hemiI: 0.56,
    bias: -0.00025, normalBias: 0.015,
  },
  alexandria_port: {
    az: 66, el: 44,
    lit: [1.56, 1.50, 1.36], shade: [0.26, 0.30, 0.44], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.20,
    charTint: [1.0, 0.96, 0.92], charShade: 0.87, charGrad: 0.07, bodyGrad: 0.20, sideTint: [0.90, 0.92, 0.98],
    blob: [0.58, 0.58, 0.64], actorShadow: false,
    top: "#2f72c8", hor: "#b8d6f0", fog: "#b8d6f0", fogNear: 28, fogFar: 250, sunDisc: "#000000",
    sunCol: "#fff6e4", sunI: 2.85, sky: "#e0f0ff", ground: "#8c8578", hemiI: 0.58,
    bias: -0.00025, normalBias: 0.015,
  },
  monte_cassino: {
    az: -42, el: 38,
    lit: [1.60, 1.34, 1.06], shade: [0.26, 0.24, 0.36], lift: [0.07, 0.05, 0.10], lambert: 0.35, sideK: 0.84, term: 0.18,
    charTint: [1.0, 0.93, 0.85], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.88, 0.86, 0.94],
    blob: [0.58, 0.52, 0.58], actorShadow: false,
    top: "#464d68", hor: "#d8a87e", fog: "#d2a47c", fogNear: 22, fogFar: 195, sunDisc: "#ffd8a0",
    sunCol: "#ffdfb4", sunI: 3.05, sky: "#d8c4b0", ground: "#8e765c", hemiI: 0.50,
    bias: -0.00025, normalBias: 0.015,
  },
  emblem_road: {
    az: 60, el: 42,
    lit: [1.58, 1.46, 1.24], shade: [0.28, 0.30, 0.42], lift: [0.05, 0.06, 0.10], lambert: 0.35, sideK: 0.84, term: 0.20,
    charTint: [1.0, 0.95, 0.90], charShade: 0.87, charGrad: 0.07, bodyGrad: 0.20, sideTint: [0.91, 0.91, 0.97],
    blob: [0.60, 0.57, 0.60], actorShadow: false,
    top: "#3672c6", hor: "#e4cca2", fog: "#e0c89e", fogNear: 26, fogFar: 240, sunDisc: "#ffe4b5",
    sunCol: "#fff2d6", sunI: 2.9, sky: "#e8effa", ground: "#8c9a5a", hemiI: 0.58,
    bias: -0.00025, normalBias: 0.015,
  },
};

export const LOOK = {
  iran_camp: {
    sky: { c: ["#ead2a8", "#dfc094", "#b8b8b8", "#749fd2", "#4a84cc"], e: [0, 4, 10, 20, 42] },
    cloud: { lit: "#fff6e5", mid: "#e6d8c3", shade: "#c5b4a2" },
    bounce: [0.03, 0.02, 0.0],
    sat: 1.06,
  },
  alexandria_port: {
    sky: { c: ["#b8d6f0", "#95c0ea", "#669fe0", "#4987d4", "#2f72c8"], e: [0, 4, 10, 20, 42] },
    cloud: { lit: "#fbf9f3", mid: "#dee6f4", shade: "#bec8e8" },
    bounce: [0.01, 0.02, 0.02],
    sat: 1.08,
  },
  monte_cassino: {
    sky: { c: ["#d8a87e", "#c49676", "#9a7e78", "#6b6676", "#464d68"], e: [0, 4, 11, 22, 42] },
    cloud: { lit: "#f5dec4", mid: "#c4a898", shade: "#8a7678" },
    bounce: [0.03, 0.02, 0.01],
    sat: 1.04,
  },
  emblem_road: {
    sky: { c: ["#e4cca2", "#c8c2a8", "#8eb0d6", "#588dd0", "#3672c6"], e: [0, 4, 10, 20, 42] },
    cloud: { lit: "#fff8eb", mid: "#e2e4f0", shade: "#c2cae6" },
    bounce: [0.02, 0.02, 0.0],
    sat: 1.08,
  },
};
