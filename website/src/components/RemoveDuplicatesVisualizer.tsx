import { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface Step {
  nums: number[];
  i: number;
  j: number;
  explanation: string;
  comparing?: boolean;
  swapping?: boolean;
  k?: number;
}

const DEFAULT_ARRAY = [1, 1, 2, 2, 2, 3, 4, 4, 5];

export default function RemoveDuplicatesVisualizer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [inputArray, setInputArray] = useState(DEFAULT_ARRAY.join(', '));

  const generateSteps = (arr: number[]): Step[] => {
    const steps: Step[] = [];
    const nums = [...arr];

    // Initial state
    steps.push({
      nums: [...nums],
      i: 0,
      j: 0,
      explanation: "Start with j=0 (position of last unique element) and i=0 (current element being examined)",
      k: 1
    });

    let j = 0;
    for (let i = 0; i < nums.length; i++) {
      if (i === 0) continue; // Skip first iteration since we already added it

      // Comparing step
      steps.push({
        nums: [...nums],
        i,
        j,
        explanation: `Compare nums[i]=${nums[i]} with nums[j]=${nums[j]}`,
        comparing: true,
        k: j + 1
      });

      if (nums[i] !== nums[j]) {
        // Found a new unique element
        j++;
        nums[j] = nums[i];

        steps.push({
          nums: [...nums],
          i,
          j,
          explanation: `nums[i]=${nums[i]} is different! Increment j to ${j}, copy nums[i] to nums[j]`,
          swapping: true,
          k: j + 1
        });
      } else {
        // Duplicate found
        steps.push({
          nums: [...nums],
          i,
          j,
          explanation: `nums[i]=${nums[i]} equals nums[j]=${nums[j]}, skip this duplicate`,
          k: j + 1
        });
      }
    }

    // Final state
    steps.push({
      nums: [...nums],
      i: nums.length,
      j,
      explanation: `Done! Return k=${j + 1}. First ${j + 1} elements contain unique values.`,
      k: j + 1
    });

    return steps;
  };

  useEffect(() => {
    const arr = inputArray.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (arr.length > 0) {
      setSteps(generateSteps(arr));
      setCurrentStep(0);
    }
  }, [inputArray]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1500);
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (steps.length === 0) {
    return <div className="text-slate-300">Enter a valid array...</div>;
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="my-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      {/* Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Input Array (comma-separated):
        </label>
        <input
          type="text"
          value={inputArray}
          onChange={(e) => setInputArray(e.target.value)}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-blue-500"
          placeholder="e.g., 1, 1, 2, 2, 3, 4, 4, 5"
        />
      </div>

      {/* Array Visualization */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {currentStepData.nums.map((num, idx) => {
            const isI = idx === currentStepData.i && currentStepData.i < currentStepData.nums.length;
            const isJ = idx === currentStepData.j;
            const isUnique = currentStepData.k !== undefined && idx < currentStepData.k;
            const isComparing = currentStepData.comparing && (isI || isJ);
            const isSwapping = currentStepData.swapping && (isI || isJ);

            let bgColor = 'bg-slate-700';
            if (isSwapping) {
              bgColor = 'bg-green-600';
            } else if (isComparing) {
              bgColor = 'bg-yellow-600';
            } else if (isUnique) {
              bgColor = 'bg-blue-600';
            }

            return (
              <div key={idx} className="flex flex-col items-center">
                {/* Index label */}
                <div className="text-xs text-slate-400 mb-1 h-4">
                  {idx}
                </div>

                {/* Array element */}
                <div
                  className={`
                    w-16 h-16 flex items-center justify-center
                    ${bgColor} text-white text-xl font-bold rounded-lg
                    transition-all duration-300 ease-in-out
                    ${isI || isJ ? 'ring-4 ring-white scale-110' : ''}
                  `}
                >
                  {num}
                </div>

                {/* Pointer labels */}
                <div className="text-xs font-semibold mt-1 h-4">
                  {isI && isJ && (
                    <span className="text-purple-400">i,j</span>
                  )}
                  {isI && !isJ && (
                    <span className="text-green-400">i</span>
                  )}
                  {isJ && !isI && (
                    <span className="text-blue-400">j</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-slate-300">Unique elements (k={currentStepData.k})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-600 rounded"></div>
            <span className="text-slate-300">Comparing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span className="text-slate-300">Updating</span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
        <div className="text-sm font-semibold text-blue-400 mb-1">
          Step {currentStep + 1} of {steps.length}
        </div>
        <div className="text-slate-200">
          {currentStepData.explanation}
        </div>
      </div>

      {/* Current State */}
      <div className="mb-6 p-4 bg-slate-900/50 rounded-lg font-mono text-sm">
        <div className="text-slate-300">
          <span className="text-blue-400">j</span> = {currentStepData.j}, {' '}
          <span className="text-green-400">i</span> = {currentStepData.i}, {' '}
          <span className="text-purple-400">k</span> = {currentStepData.k}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          disabled={currentStep === 0}
        >
          Reset
        </Button>
        <Button
          onClick={handlePrev}
          variant="outline"
          size="sm"
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        <Button
          onClick={handlePlayPause}
          variant="default"
          size="sm"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button
          onClick={handleNext}
          variant="outline"
          size="sm"
          disabled={currentStep === steps.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
