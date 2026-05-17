export const loadingScreenDelayMs = 2600;

export function waitForLoadingScreen() {
  return new Promise((resolve) => {
    setTimeout(resolve, loadingScreenDelayMs);
  });
}
