/**
 * TDD Workflow State Tracker
 *
 * Manages RED-GREEN-REFACTOR phase transitions and enforces rules
 *
 * @category TDD/Workflow
 * @version 1.0.0
 * @created 2025-11-17
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

export type TDDPhase = 'IDLE' | 'RED' | 'GREEN' | 'REFACTOR';

export type TDDState = {
  readonly currentPhase: TDDPhase;
  readonly sessionId: string;
  readonly startedAt: string;
  readonly currentTest?: {
    readonly file: string;
    readonly description: string;
    readonly status: 'failing' | 'passing';
  };
  readonly productionFiles: readonly string[];
  readonly testFiles: readonly string[];
  readonly lastCommit: string;
  readonly projectType: 'typescript' | 'javascript' | 'python' | 'go';
  readonly testFramework: string;
  readonly metrics: {
    readonly cyclesCompleted: number;
    readonly violationsCaught: number;
    readonly coverageStart: number;
    readonly coverageNow: number;
  };
};

export class TDDTracker {
  private readonly statePath: string;

  constructor(projectRoot: string) {
    this.statePath = join(projectRoot, '.tdd-state.json');
  }

  /**
   * Load current TDD state
   */
  loadState(): TDDState | null {
    if (!existsSync(this.statePath)) {
      return null;
    }

    const content = readFileSync(this.statePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save TDD state
   */
  saveState(state: TDDState): void {
    const content = JSON.stringify(state, null, 2);
    writeFileSync(this.statePath, content);
  }

  /**
   * Initialize new TDD session
   */
  initialize(projectType: TDDState['projectType'], testFramework: string): TDDState {
    const state: TDDState = {
      currentPhase: 'IDLE',
      sessionId: this.generateSessionId(),
      startedAt: new Date().toISOString(),
      productionFiles: [],
      testFiles: [],
      lastCommit: this.getLastCommitSha(),
      projectType,
      testFramework,
      metrics: {
        cyclesCompleted: 0,
        violationsCaught: 0,
        coverageStart: this.measureCoverage(),
        coverageNow: this.measureCoverage(),
      },
    };

    this.saveState(state);
    return state;
  }

  /**
   * Transition to RED phase
   */
  transitionToRed(testFile: string, testDescription: string): TDDState {
    const current = this.loadState();
    if (!current) {
      throw new Error('TDD not initialized - run /tdd-init first');
    }

    const newState: TDDState = {
      ...current,
      currentPhase: 'RED',
      currentTest: {
        file: testFile,
        description: testDescription,
        status: 'failing',
      },
      testFiles: [...current.testFiles, testFile],
    };

    this.saveState(newState);
    return newState;
  }

  /**
   * Transition to GREEN phase (validate test is failing)
   */
  transitionToGreen(productionFile: string): TDDState {
    const current = this.loadState();
    if (!current || current.currentPhase !== 'RED') {
      throw new Error('Must be in RED phase to transition to GREEN');
    }

    // Verify test is actually failing
    if (!this.runTests(current.currentTest!.file)) {
      throw new Error('Test must be failing before transitioning to GREEN');
    }

    const newState: TDDState = {
      ...current,
      currentPhase: 'GREEN',
      productionFiles: [...current.productionFiles, productionFile],
    };

    this.saveState(newState);
    return newState;
  }

  /**
   * Transition to REFACTOR phase (validate tests passing)
   */
  transitionToRefactor(): TDDState {
    const current = this.loadState();
    if (!current || current.currentPhase !== 'GREEN') {
      throw new Error('Must be in GREEN phase to transition to REFACTOR');
    }

    // Verify tests are passing
    if (!this.runTests()) {
      throw new Error('Tests must be passing before refactoring');
    }

    const newState: TDDState = {
      ...current,
      currentPhase: 'REFACTOR',
      currentTest: current.currentTest
        ? { ...current.currentTest, status: 'passing' }
        : undefined,
    };

    this.saveState(newState);
    return newState;
  }

  /**
   * Complete cycle and return to IDLE
   */
  completeCycle(): TDDState {
    const current = this.loadState();
    if (!current) {
      throw new Error('No active TDD session');
    }

    const newState: TDDState = {
      ...current,
      currentPhase: 'IDLE',
      currentTest: undefined,
      lastCommit: this.getLastCommitSha(),
      metrics: {
        ...current.metrics,
        cyclesCompleted: current.metrics.cyclesCompleted + 1,
        coverageNow: this.measureCoverage(),
      },
    };

    this.saveState(newState);
    return newState;
  }

  /**
   * Validate current phase rules
   */
  validatePhaseRules(phase: TDDPhase): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    switch (phase) {
      case 'RED':
        // Check for production code changes
        const prodChanges = this.getModifiedProductionFiles();
        if (prodChanges.length > 0) {
          violations.push(
            `Production code modified in RED phase: ${prodChanges.join(', ')}`
          );
        }
        break;

      case 'GREEN':
        // Verify test is failing
        const state = this.loadState();
        if (state?.currentTest && this.runTests(state.currentTest.file)) {
          violations.push('Test is not failing - cannot proceed to GREEN phase');
        }
        break;

      case 'REFACTOR':
        // Verify tests passing
        if (!this.runTests()) {
          violations.push('Tests failing during refactoring');
        }
        break;
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Record a violation
   */
  recordViolation(violation: string): void {
    const current = this.loadState();
    if (!current) return;

    const newState: TDDState = {
      ...current,
      metrics: {
        ...current.metrics,
        violationsCaught: current.metrics.violationsCaught + 1,
      },
    };

    this.saveState(newState);
    this.logViolation(violation);
  }

  /**
   * Generate report
   */
  generateReport(): string {
    const state = this.loadState();
    if (!state) {
      return 'No TDD session active';
    }

    const coverageImprovement =
      ((state.metrics.coverageNow - state.metrics.coverageStart) /
       state.metrics.coverageStart * 100).toFixed(1);

    return `
## TDD Workflow Report

### Current State
- **Phase**: ${state.currentPhase}
- **Session ID**: ${state.sessionId}
- **Started**: ${new Date(state.startedAt).toLocaleDateString()}

### Metrics
- **Cycles Completed**: ${state.metrics.cyclesCompleted}
- **Violations Caught**: ${state.metrics.violationsCaught}
- **Coverage Improvement**: ${coverageImprovement}%
- **Test Files**: ${state.testFiles.length}
- **Production Files**: ${state.productionFiles.length}

### Current Test
${state.currentTest ? `
- **File**: ${state.currentTest.file}
- **Description**: ${state.currentTest.description}
- **Status**: ${state.currentTest.status}
` : '_None (IDLE state)_'}
    `.trim();
  }

  // Private helper methods

  private generateSessionId(): string {
    return `tdd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLastCommitSha(): string {
    try {
      return execSync('git rev-parse HEAD').toString().trim();
    } catch {
      return 'no-git';
    }
  }

  private measureCoverage(): number {
    // Implementation varies by language
    // Return 0-100 percentage
    try {
      const result = execSync('npm test -- --coverage --json', {
        encoding: 'utf-8',
      });
      const coverage = JSON.parse(result);
      return coverage.total.lines.pct;
    } catch {
      return 0;
    }
  }

  private runTests(testFile?: string): boolean {
    try {
      const command = testFile
        ? `npm test -- ${testFile}`
        : 'npm test';

      execSync(command, { stdio: 'pipe' });
      return false; // Tests passed (we want them to fail in RED phase)
    } catch {
      return true; // Tests failed (expected in RED phase)
    }
  }

  private getModifiedProductionFiles(): string[] {
    try {
      const result = execSync('git diff --name-only', {
        encoding: 'utf-8',
      });

      return result
        .split('\n')
        .filter(file => file && !this.isTestFile(file));
    } catch {
      return [];
    }
  }

  private isTestFile(file: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file) ||
           /test_.*\.py$/.test(file) ||
           /_test\.go$/.test(file);
  }

  private logViolation(violation: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, violation });

    try {
      execSync(`echo '${logEntry}' >> .tdd-violations.jsonl`);
    } catch {
      // Silent fail if logging doesn't work
    }
  }
}
