import React from 'react';
import {
  Timer, ArrowDownToLine, Droplets, Crosshair,
  Settings, Camera, LogOut, Check, X, Loader2, Info
} from 'lucide-react';
import { PROCESS_STEPS } from '../../constants/processSteps';
import { STEP_DESCRIPTIONS } from '../../lib/logInterpreter';

const ICON_MAP = {
  Timer, ArrowDownToLine, Droplets, Crosshair, Settings, Camera, LogOut,
};

function parseTimestamp(ts) {
  if (!ts) return null;
  const match = ts.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  return new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);
}

function formatDuration(startTime, endTime, lastLogTimestamp) {
  if (!startTime) return '';
  const start = parseTimestamp(startTime);
  const end = endTime ? parseTimestamp(endTime) : parseTimestamp(lastLogTimestamp);
  if (!start || !end) return '';
  const diffSec = Math.floor((end - start) / 1000);
  if (diffSec < 0) return '';
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  return `${min}m ${sec}s`;
}

export default function ProcessFlow({ steps, currentStep, lastLogTimestamp }) {
  const currentDesc = currentStep ? STEP_DESCRIPTIONS[currentStep] : null;

  return (
    <div className="process-flow">
      <h3 className="section-title">Process Flow</h3>
      <div className="process-flow__steps">
        {PROCESS_STEPS.map((stepDef, i) => {
          const stepData = steps[stepDef.key];
          const status = stepData?.state || 'idle';
          const isCurrent = currentStep === stepDef.key;
          const Icon = ICON_MAP[stepDef.icon] || Timer;

          return (
            <React.Fragment key={stepDef.key}>
              {i > 0 && (
                <div className={`process-flow__connector ${
                  status !== 'idle' ? 'process-flow__connector--done' : ''
                }`} />
              )}
              <div className={`process-step process-step--${status} ${
                isCurrent ? 'process-step--current' : ''
              }`}>
                <div className="process-step__icon">
                  {status === 'inProgress' || isCurrent ? (
                    <Loader2 size={20} className="spinning" />
                  ) : status === 'success' ? (
                    <Check size={20} />
                  ) : status === 'fail' ? (
                    <X size={20} />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                <div className="process-step__label">{stepDef.label}</div>
                {stepData && (
                  <div className="process-step__duration">
                    {formatDuration(stepData.startTime, stepData.endTime, lastLogTimestamp)}
                  </div>
                )}
                {isCurrent && status === 'inProgress' && (
                  <div className="process-step__pulse" />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 현재 단계 설명 */}
      {currentDesc && (
        <div className="step-description">
          <div className="step-description__icon">{currentDesc.icon}</div>
          <div className="step-description__body">
            <div className="step-description__title">{currentDesc.title}</div>
            <div className="step-description__text">{currentDesc.detail}</div>
            {currentDesc.tips?.length > 0 && (
              <div className="step-description__tips">
                {currentDesc.tips.map((tip, i) => (
                  <div key={i} className="step-description__tip">
                    <Info size={11} /> {tip}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
