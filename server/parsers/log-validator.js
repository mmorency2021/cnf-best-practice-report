const fs = require('fs');
const readline = require('readline');

async function validate(filePath) {
  const warnings = [];
  let errorCount = 0;
  let totalLines = 0;
  let probePodMissing = false;
  let crashDetected = false;
  const lastLines = [];
  const MAX_LAST_LINES = 100;

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    totalLines++;
    if (/\bERROR\b/i.test(line)) errorCount++;
    if (/probe.*pod.*not\s+(running|found|ready)/i.test(line)) probePodMissing = true;
    if (/\b(panic|fatal|segfault)\b/i.test(line)) crashDetected = true;

    lastLines.push(line);
    if (lastLines.length > MAX_LAST_LINES) lastLines.shift();
  }

  if (errorCount > 50) {
    warnings.push({
      type: 'excessive-errors',
      message: `High error rate detected: ${errorCount} ERROR lines in ${totalLines} total lines`,
      details: `${errorCount} errors found. Threshold is 50.`
    });
  }

  if (probePodMissing) {
    warnings.push({
      type: 'probe-pod-missing',
      message: 'Probe pod not running or not found during test execution',
      details: 'The certsuite probe pod may have failed to start. Results may be incomplete.'
    });
  }

  if (crashDetected) {
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
    stats: { totalLines, errorCount }
  };
}

module.exports = { validate };
