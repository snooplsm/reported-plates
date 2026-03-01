import { downloadAll } from "../api/segment";

type WarmupRequest = {
  type: "warmup";
};

type WarmupProgress = {
  type: "progress";
  payload: { text: string; progress: number };
};

type WarmupDone = {
  type: "done";
};

type WarmupError = {
  type: "error";
  payload: { message: string };
};

let warmupPromise: Promise<void> | null = null;

const post = (msg: WarmupProgress | WarmupDone | WarmupError) => {
  self.postMessage(msg);
};

self.onmessage = async (event: MessageEvent<WarmupRequest>) => {
  if (event.data?.type !== "warmup") {
    return;
  }

  if (!warmupPromise) {
    warmupPromise = (async () => {
      try {
        await downloadAll((state) => {
          post({ type: "progress", payload: state });
        });
        post({ type: "done" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Model warmup failed";
        post({ type: "error", payload: { message } });
      } finally {
        warmupPromise = null;
      }
    })();
  }

  await warmupPromise;
};
