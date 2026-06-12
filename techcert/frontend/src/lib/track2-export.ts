import { api } from "@/lib/api";

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportTrack2Json(runId: string) {
  const result = await api.exportTrack2Submission(runId);
  downloadBlob(
    JSON.stringify(result.submission, null, 2),
    `signalforge-track2-${runId}.json`,
    "application/json",
  );
  return result;
}

export async function exportTrack2Writeup(runId: string) {
  const result = await api.exportTrack2Submission(runId);
  const writeup = result.submission.strategyExplanation;
  if (!writeup) {
    throw new Error("Strategy explanation not available for this run");
  }
  downloadBlob(writeup, `signalforge-track2-${runId}-writeup.md`, "text/markdown");
  return result;
}

export async function exportTrack2Bundle(runId: string) {
  const result = await api.exportTrack2Submission(runId);
  downloadBlob(
    JSON.stringify(result.submission, null, 2),
    `signalforge-track2-${runId}.json`,
    "application/json",
  );
  if (result.submission.strategyExplanation) {
    downloadBlob(
      result.submission.strategyExplanation,
      `signalforge-track2-${runId}-writeup.md`,
      "text/markdown",
    );
  }
  return result;
}
