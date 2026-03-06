/**
 * 从 PCM 采样（16bit 有符号）计算简单声纹特征向量，用于占位级声纹匹配。
 * 特征：均值、标准差、过零率、短时能量均值，以及 10 个频段的能量占比（近似）。
 */

function readPcmFromBuffer(buffer: ArrayBuffer, offsetBytes: number): Int16Array {
  const view = new DataView(buffer);
  const len = (buffer.byteLength - offsetBytes) >> 1;
  const arr = new Int16Array(len);
  for (let i = 0; i < len; i += 1) {
    arr[i] = view.getInt16(offsetBytes + i * 2, true);
  }
  return arr;
}

/** WAV 头约 44 字节，若 buffer 前 4 字节为 "RIFF" 则按 WAV 跳过头部 */
function getPcmOffset(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 44) return 0;
  const riff = new TextDecoder().decode(buffer.slice(0, 4));
  return riff === "RIFF" ? 44 : 0;
}

function mean(samples: Int16Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i];
  return sum / samples.length;
}

function std(samples: Int16Array, m: number): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const d = samples[i] - m;
    sum += d * d;
  }
  return Math.sqrt(sum / samples.length) || 0;
}

function zeroCrossingRate(samples: Int16Array): number {
  let count = 0;
  for (let i = 1; i < samples.length; i += 1) {
    if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) count += 1;
  }
  return count / (samples.length - 1) || 0;
}

/** 短时能量：每 256 帧一块，取块内平方和再取平均 */
function shortTermEnergy(samples: Int16Array): number {
  const block = 256;
  let total = 0;
  let n = 0;
  for (let i = 0; i + block <= samples.length; i += block) {
    let e = 0;
    for (let j = 0; j < block; j += 1) {
      const s = samples[i + j];
      e += s * s;
    }
    total += Math.sqrt(e / block);
    n += 1;
  }
  return n > 0 ? total / n : 0;
}

/** 将 samples 分成 10 段，每段能量（平方和）占比作为 10 维特征 */
function energyBands(samples: Int16Array): number[] {
  const bands = 10;
  const step = Math.floor(samples.length / bands) || 1;
  const energies: number[] = [];
  let total = 0;
  for (let b = 0; b < bands; b += 1) {
    const start = b * step;
    const end = Math.min(start + step, samples.length);
    let e = 0;
    for (let i = start; i < end; i += 1) {
      const s = samples[i];
      e += s * s;
    }
    energies.push(e);
    total += e;
  }
  if (total <= 0) return energies.map(() => 1 / bands);
  return energies.map((e) => e / total);
}

/**
 * 从音频 Blob 提取声纹特征向量。
 * 支持原始 PCM 或带 44 字节头的 WAV；假设 16bit 单声道。
 */
export async function extractVoiceFeatures(audioBlob: Blob): Promise<number[]> {
  const buffer = await audioBlob.arrayBuffer();
  const offset = getPcmOffset(buffer);
  const samples = readPcmFromBuffer(buffer, offset);
  if (samples.length < 100) {
    return [
      0, 0, 0, 0, 0,
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1
    ];
  }

  const m = mean(samples);
  const s = std(samples, m);
  const zcr = zeroCrossingRate(samples);
  const ste = shortTermEnergy(samples);
  const bands = energyBands(samples);

  // 归一化到相近量纲：均值/1e4、标准差/1e4、过零率、能量/1e6
  return [
    m / 1e4,
    s / 1e4,
    zcr,
    ste / 1e6,
    0, // 预留
    ...bands
  ];
}

/** 欧氏距离，用于声纹匹配 */
export function euclideanDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}
