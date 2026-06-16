const fs = require('fs');
const readline = require('readline');

async function validate(filePath) {
  const warnings = [];
  let totalLines = 0;
  let probePodIssue = false;
  let probePodActive = false;
  let lastCrashLine = 0;
  let lastActivityLine = 0;
  const lastLines = [];
  const MAX_LAST_LINES = 100;

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    totalLines++;
    if (/certsuite-probe.*not\s+(running|found|ready)/i.test(line) || /probe\s*(daemonset|daemon\s*set).*not\s+(running|found|ready|spawn)/i.test(line) || /failed.*to.*deploy.*certsuite.*probe/i.test(line) || /probe\s*pod.*failed\s*to\s*(start|deploy|create)/i.test(line)) probePodIssue = true;
    if (/certsuite-probe-\w+.*container/i.test(line) || /execute command on.*certsuite-probe/i.test(line)) probePodActive = true;
    if (/\b(panic|fatal|segfault)\b/i.test(line)) lastCrashLine = totalLines;
    if (/certsuite-probe-\w+.*container/i.test(line) || /execute command on.*certsuite-probe/i.test(line) || /\bRunning\b.*\btest\b/i.test(line) || /\bSuite\b.*\b(started|running)\b/i.test(line)) lastActivityLine = totalLines;

    lastLines.push(line);
    if (lastLines.length > MAX_LAST_LINES) lastLines.shift();
  }

  if (probePodIssue && !probePodActive) {
    warnings.push({
      type: 'probe-pod-missing',
      message: 'Probe pod not running or not found during test execution',
      details: 'The certsuite probe pod may have failed to start. Results may be incomplete.'
    });
  }

  if (lastCrashLine > 0 && lastActivityLine <= lastCrashLine) {
    warnings.push({
      type: 'crash-detected',
      message: 'Crash or fatal error detected in execution log',
      details: 'A panic, fatal error, or segfault was found in the log.'
    });
  }

  const lastBlock = lastLines.join('\n');
  const completionPatterns = /claim\s*(file)?\s*(created|generated|written)|suite\s*(completed|finished)|tests?\s*completed|results?\s*(saved|exported)/i;
  if (!completionPatterns.test(lastBlock) && totalLines > 10) {
    warnings.push({
      type: 'incomplete-execution',
      message: 'No completion marker found — test execution may not have finished',
      details: 'The log does not end with a recognizable completion message.'
    });
  }

  return {
    healthy: warnings.length === 0,
    warnings,
    stats: { totalLines }
  };
}

module.exports = { validate };
