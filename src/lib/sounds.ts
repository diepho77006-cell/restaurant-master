// Sound utility using Web Audio API — no external files needed

const audioCtx = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

/** Short "ding" for staff adding item */
export const playAddItemSound = () => {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
};

/** Bell chime for kitchen new order */
export const playKitchenNewOrderSound = () => {
  try {
    const ctx = audioCtx();
    [0, 0.15, 0.3].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime([660, 880, 1100][i], ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch {}
};

/** Status change sound — short double beep */
export const playStatusChangeSound = () => {
  try {
    const ctx = audioCtx();
    [0, 0.12].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(750, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.1);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.1);
    });
  } catch {}
};
