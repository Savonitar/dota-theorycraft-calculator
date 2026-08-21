const DEFAULT_WINDOW_OPTIONS = Object.freeze({
  width: 420,
  height: 560,
  minWidth: 420,
  minHeight: 440,
  center: true,
  resizable: true
});

function getWindowOptions() {
  return { ...DEFAULT_WINDOW_OPTIONS };
}

module.exports = {
  DEFAULT_WINDOW_OPTIONS,
  getWindowOptions
};
