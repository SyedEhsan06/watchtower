/** Minimal concurrency limiter — runs at most `limit` tasks at a time. */
export function createLimiter(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (active >= limit || queue.length === 0) return;
    active++;
    const run = queue.shift()!;
    run();
  }

  return function withLimit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}
