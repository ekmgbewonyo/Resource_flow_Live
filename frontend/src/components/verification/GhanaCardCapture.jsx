/**
 * Ghana Card + Selfie capture for QoreID verification.
 * Captures Ghana Card image and user selfie, then verifies via verifyWithImages API.
 */
import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Camera, CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { ghanaCardApi } from '../../services/api';

const STEPS = [
  { id: 'ghana_card', title: 'Ghana Card', icon: CreditCard },
  { id: 'selfie', title: 'Your Photo (Selfie)', icon: Camera },
];

export const GhanaCardCapture = ({
  firstname,
  lastname,
  consentGiven,
  onVerified,
  onError,
  disabled = false,
}) => {
  const [step, setStep] = useState(0);
  const [ghanaCardBase64, setGhanaCardBase64] = useState(null);
  const [selfieBase64, setSelfieBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleCameraError = (err) => {
    const msg = (typeof err === 'string' ? err : err?.message) || 'Camera access failed';
    setCameraError(msg.includes('Permission') || msg.includes('denied')
      ? 'Camera access denied. Please allow camera in your browser settings and refresh.'
      : 'Camera not found or not accessible. Try using "Choose or Capture Ghana Card" to upload a photo instead.');
  };

  const handleCameraReady = () => setCameraError(null);

  const handleGhanaCardCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCameraError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setGhanaCardBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGhanaCardWebcam = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    const base64 = imageSrc.includes(',') ? imageSrc.split(',')[1] : imageSrc;
    setGhanaCardBase64(base64);
  };

  const handleSelfieCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    const base64 = imageSrc.includes(',') ? imageSrc.split(',')[1] : imageSrc;
    setSelfieBase64(base64);
  };

  const handleSubmit = async () => {
    if (!ghanaCardBase64 || !selfieBase64) return;
    if (!firstname?.trim() || !lastname?.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!consentGiven) {
      setError('Consent is required for Ghana Card verification.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await ghanaCardApi.verifyWithImages({
        ghana_card_base64: ghanaCardBase64,
        user_photo_base64: selfieBase64,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        consent_given: true,
      });
      if (result.verified) {
        onVerified?.(result);
      } else {
        const msg = result.error || 'Verification failed. Please try again.';
        setError(msg);
        onError?.(result);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Verification failed.';
      setError(msg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS[step];
  const StepIcon = currentStep?.icon;

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 space-y-4">
      <div className="flex items-center gap-2">
        {StepIcon && <StepIcon className="text-blue-600" size={20} />}
        <h4 className="font-semibold text-slate-800">{currentStep?.title}</h4>
      </div>

      <div className="flex gap-2 mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded ${i <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {(error || cameraError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 shrink-0" size={18} />
          <p className="text-sm text-red-700">{error || cameraError}</p>
        </div>
      )}

      {/* Step 1: Ghana Card */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Capture a clear photo of your Ghana Card. Ensure all text and numbers are visible.
          </p>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleGhanaCardCapture}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              icon={CreditCard}
            >
              Choose or Capture Ghana Card
            </Button>
          </div>
          <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video max-w-sm">
            <Webcam
              key="ghana-card"
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ width: 640, height: 480, facingMode: { ideal: 'environment' } }}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
            />
            <Button
              type="button"
              onClick={handleGhanaCardWebcam}
              disabled={disabled}
              className="absolute bottom-2 left-1/2 -translate-x-1/2"
              icon={Camera}
            >
              Capture from Camera
            </Button>
          </div>
          {ghanaCardBase64 && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle size={16} /> Ghana Card captured
            </p>
          )}
        </div>
      )}

      {/* Step 2: Selfie */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Take a live photo of yourself (selfie) for identity verification.
          </p>
          <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video max-w-sm">
            <Webcam
              key="selfie"
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ width: 640, height: 480, facingMode: { ideal: 'user' } }}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
            />
            <Button
              type="button"
              onClick={handleSelfieCapture}
              disabled={disabled}
              className="absolute bottom-2 left-1/2 -translate-x-1/2"
              icon={Camera}
            >
              Capture Selfie
            </Button>
          </div>
          {selfieBase64 && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle size={16} /> Selfie captured
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
        >
          Back
        </Button>
        {step === 0 ? (
          <Button
            type="button"
            onClick={() => setStep(1)}
            disabled={!ghanaCardBase64 || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selfieBase64 || loading}
            icon={loading ? Loader2 : undefined}
          >
            {loading ? 'Verifying...' : 'Verify Ghana Card'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default GhanaCardCapture;
