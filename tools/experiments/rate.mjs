const { D } = await import('../simlib.mjs');
D.SPECIAL_RATE.Easy = +process.env.EASY;
await import('../run.mjs');
