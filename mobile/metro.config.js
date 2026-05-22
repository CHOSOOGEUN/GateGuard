const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── 메모리 절약: 워커 수 제한 ──────────────────────────────
// 기본값은 CPU 코어 수 - 1 이므로 고사양 머신에서 OOM 발생.
// 2개로 고정하면 안정적으로 동작.
config.maxWorkers = 2;

// ── Transformer 설정 ──────────────────────────────────────
config.transformer = {
  ...config.transformer,
  // 개발 중 minify 비활성화 → 메모리 절약
  minifierPath: 'metro-transform-plugins',
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: { keep_classnames: true, keep_fnames: true },
  },
};

// ── Resolver: node_modules 내부 불필요한 경로 제외 ──────────
config.resolver = {
  ...config.resolver,
  // 심볼릭 링크 비활성화 (일부 환경에서 무한 순환 방지)
  unstable_enableSymlinks: false,
};

// ── Watcher: 과도한 파일 감시 제한 ────────────────────────
config.watchFolders = [];

module.exports = config;
