const { performance } = require('node:perf_hooks');

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const baseUrl = String(process.env.LOAD_BASE_URL || 'http://127.0.0.1:5000')
  .replace(/\/+$/, '');
const scenario = String(process.env.LOAD_SCENARIO || 'health').toLowerCase();
const token = String(process.env.LOAD_TOKEN || '');
const requestUuid = String(process.env.LOAD_REQUEST_UUID || '');
const durationSeconds = positiveInteger(process.env.LOAD_DURATION_SECONDS, 30);
const concurrency = positiveInteger(process.env.LOAD_CONCURRENCY, 10);
const timeoutMs = positiveInteger(process.env.LOAD_TIMEOUT_MS, 10_000);
const allowWrites = process.env.LOAD_ALLOW_WRITES === 'true';
const expectRateLimit = process.env.LOAD_EXPECT_RATE_LIMIT === 'true';
const maximumP95Ms = positiveInteger(process.env.LOAD_MAX_P95_MS, 1_000);
const maximumErrorRate = Math.max(
  0,
  Number.parseFloat(process.env.LOAD_MAX_ERROR_RATE) || 0.01
);

const authenticatedScenarios = new Set([
  'notifications',
  'requests',
  'gps',
  'chat-read',
  'chat-write',
  'mixed',
]);
const writeScenarios = new Set(['gps', 'chat-write']);

if (authenticatedScenarios.has(scenario) && !token) {
  throw new Error(`LOAD_TOKEN est obligatoire pour le scenario ${scenario}`);
}
if (['requests', 'gps', 'chat-read', 'chat-write', 'mixed'].includes(scenario)
  && !requestUuid) {
  throw new Error(`LOAD_REQUEST_UUID est obligatoire pour le scenario ${scenario}`);
}
if (writeScenarios.has(scenario) && !allowWrites) {
  throw new Error(
    `Le scenario ${scenario} modifie les donnees. Definissez LOAD_ALLOW_WRITES=true.`
  );
}

const headers = token ? { Authorization: `Bearer ${token}` } : {};
let sequence = 0;

const buildRequest = (selectedScenario) => {
  switch (selectedScenario) {
    case 'health':
      return { path: '/health', method: 'GET' };
    case 'api':
      return { path: '/api/categories', method: 'GET' };
    case 'notifications':
      return { path: '/api/notifications', method: 'GET' };
    case 'requests':
      return { path: `/api/requests/${requestUuid}`, method: 'GET' };
    case 'chat-read':
      return { path: `/api/requests/${requestUuid}/messages?limit=50`, method: 'GET' };
    case 'gps': {
      const offset = (sequence % 20) / 100_000;
      return {
        path: `/api/requests/${requestUuid}/location`,
        method: 'PUT',
        body: {
          latitude: 4.0511 + offset,
          longitude: 9.7679 + offset,
          accuracy_meters: 10,
        },
      };
    }
    case 'chat-write':
      return {
        path: `/api/requests/${requestUuid}/messages`,
        method: 'POST',
        body: { body: `Test de charge EcoGarbage ${Date.now()}-${sequence}` },
      };
    default:
      throw new Error(`Scenario inconnu: ${selectedScenario}`);
  }
};

const mixedScenarios = ['api', 'notifications', 'requests', 'chat-read'];
const nextRequest = () => {
  sequence += 1;
  const selected = scenario === 'mixed'
    ? mixedScenarios[sequence % mixedScenarios.length]
    : scenario;
  return buildRequest(selected);
};

const percentile = (sorted, ratio) => {
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1)
  );
  return sorted[index];
};

const run = async () => {
  const endAt = performance.now() + durationSeconds * 1_000;
  const durations = [];
  const statuses = new Map();
  let completed = 0;
  let failed = 0;
  let rateLimited = 0;

  const worker = async () => {
    while (performance.now() < endAt) {
      const request = nextRequest();
      const startedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${request.path}`, {
          method: request.method,
          headers: {
            ...headers,
            ...(request.body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
        await response.arrayBuffer();
        durations.push(performance.now() - startedAt);
        statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
        completed += 1;
        if (response.status === 429) rateLimited += 1;
        else if (response.status < 200 || response.status >= 400) failed += 1;
      } catch {
        durations.push(performance.now() - startedAt);
        completed += 1;
        failed += 1;
        statuses.set('network_error', (statuses.get('network_error') || 0) + 1);
      }
    }
  };

  const testStartedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedSeconds = (performance.now() - testStartedAt) / 1_000;
  durations.sort((left, right) => left - right);

  const result = {
    target: baseUrl,
    scenario,
    duration_seconds: Math.round(elapsedSeconds * 100) / 100,
    concurrency,
    requests: completed,
    requests_per_second: Math.round((completed / elapsedSeconds) * 100) / 100,
    latency_ms: {
      min: Math.round((durations[0] || 0) * 100) / 100,
      p50: Math.round(percentile(durations, 0.5) * 100) / 100,
      p95: Math.round(percentile(durations, 0.95) * 100) / 100,
      p99: Math.round(percentile(durations, 0.99) * 100) / 100,
      max: Math.round((durations.at(-1) || 0) * 100) / 100,
    },
    failed,
    rate_limited: rateLimited,
    error_rate: completed ? Math.round((failed / completed) * 10_000) / 10_000 : 1,
    statuses: Object.fromEntries(statuses),
  };

  console.log(JSON.stringify(result, null, 2));

  const rateLimitExpectationFailed = expectRateLimit && rateLimited === 0;
  const performanceFailed = !expectRateLimit && (
    result.latency_ms.p95 > maximumP95Ms
    || result.error_rate > maximumErrorRate
    || rateLimited > 0
  );
  if (rateLimitExpectationFailed || performanceFailed) process.exitCode = 1;
};

run().catch((error) => {
  console.error(`Test de charge impossible: ${error.message}`);
  process.exitCode = 1;
});
