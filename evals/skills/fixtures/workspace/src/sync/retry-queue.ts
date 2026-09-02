type Job = () => Promise<unknown>;

type RetryQueueOptions = {
  readonly maxAttempts: number;
  readonly backoffMs: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RetryQueue {
  private jobs: Job[] = [];
  public failed = 0;

  constructor(private readonly options: RetryQueueOptions) {}

  enqueue(job: Job): void {
    this.jobs.push(job);
  }

  async drain(): Promise<void> {
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) continue;
      let attempt = 0;
      while (attempt < this.options.maxAttempts) {
        try {
          await job();
          break;
        } catch {
          attempt += 1;
          if (attempt >= this.options.maxAttempts) {
            this.failed += 1;
            break;
          }
          await sleep(this.options.backoffMs * 2 ** (attempt - 1));
        }
      }
    }
  }
}
