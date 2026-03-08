// ## Delivery Verification - Step-by-step wizard for driver at handover
// ## Step 1: Ghana Card | Step 2: Recipient Photo | Step 3: Recipient Ghana Card Verify | Step 4: Complete
import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Camera, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { tripApi, requestApi, ghanaCardApi } from '../../services/api';

const STEPS = [
  { id: 'ghana_card', title: 'Ghana Card', icon: CreditCard },
  { id: 'recipient_photo', title: 'Recipient Photo', icon: Camera },
  { id: 'recipient_verify', title: 'Recipient Ghana Card Verify', icon: ShieldCheck },
  { id: 'submit', title: 'Complete', icon: CheckCircle },
];

export const DeliveryVerification = ({ trip, onComplete }) => {
  const [step, setStep] = useState(0);
  const [ghaCardPath, setGhaCardPath] = useState('');
  const [recipientPhotoPath, setRecipientPhotoPath] = useState('');
  const [recipientComments, setRecipientComments] = useState('');
  const [recipientGhanaCard, setRecipientGhanaCard] = useState('');
  const [recipientGhanaCardVerified, setRecipientGhanaCardVerified] = useState(false);
  const [verifyingGhanaCard, setVerifyingGhanaCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const webcamRef = useRef(null);

  const recipientName = trip?.request?.user?.name ? trip.request.user.name.split(/\s+/)[0] : 'Recipient';

  const uploadFile = async (file, type = 'delivery_proof') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const result = await requestApi.uploadFile(formData);
    if (!result.success || !result.path) throw new Error(result.message || 'Upload failed');
    return result.path;
  };

  const handleGhanaCardCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const path = await uploadFile(file);
      setGhaCardPath(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientPhotoCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    setLoading(true);
    setError(null);
    try {
      const blob = await (await fetch(imageSrc)).blob();
      const file = new File([blob], 'recipient.jpg', { type: 'image/jpeg' });
      const path = await uploadFile(file);
      setRecipientPhotoPath(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecipientGhanaCard = async () => {
    if (!recipientGhanaCard?.trim()) {
      setError('Please enter the recipient\'s Ghana Card number.');
      return;
    }
    const nameParts = (trip?.request?.user?.name || '').trim().split(/\s+/).filter(Boolean);
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || nameParts[0] || '';
    if (!firstname || !lastname) {
      setError('Recipient name is required for verification.');
      return;
    }
    setVerifyingGhanaCard(true);
    setError(null);
    try {
      const result = await ghanaCardApi.verify({
        id_number: recipientGhanaCard.trim(),
        firstname,
        lastname,
        consent_given: true,
      });
      if (result.verified) {
        setRecipientGhanaCardVerified(true);
      } else {
        setError(result.error || 'Ghana Card verification failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed.');
    } finally {
      setVerifyingGhanaCard(false);
    }
  };

  const handleSubmit = async () => {
    if (!recipientGhanaCardVerified) {
      setError('Recipient must verify their Ghana Card before delivery can be completed.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await tripApi.complete(trip.id, {
        gha_card_path: ghaCardPath || undefined,
        recipient_photo_path: recipientPhotoPath || undefined,
        recipient_comments: recipientComments || undefined,
        recipient_confirmed: true,
        recipient_ghana_card_verified: true,
        recipient_ghana_card_number: recipientGhanaCard,
      });
      onComplete?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete delivery');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS[step];
  const StepIcon = currentStep?.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        {StepIcon && <StepIcon size={20} />}
        {currentStep?.title}
      </h3>

      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded ${i <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {(error || cameraError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle className="text-red-600 shrink-0" size={18} />
          <p className="text-sm text-red-700">{error || cameraError}</p>
        </div>
      )}

      {/* Step 1: Ghana Card */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Capture a photo of the recipient&apos;s Ghana Card</p>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleGhanaCardCapture}
              className="hidden"
            />
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition">
              {ghaCardPath ? (
                <p className="text-emerald-600 font-medium">✓ Ghana Card captured</p>
              ) : (
                <p className="text-slate-600">Tap to capture or upload</p>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Step 2: Recipient Photo */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Take a live photo of the recipient for verification</p>
          <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ width: 640, height: 480, facingMode: { ideal: 'user' } }}
              onUserMedia={() => setCameraError(null)}
              onUserMediaError={(err) => {
                const msg = (typeof err === 'string' ? err : err?.message) || 'Camera access failed';
                setCameraError(msg.includes('Permission') || msg.includes('denied')
                  ? 'Camera access denied. Please allow camera in your browser settings and refresh.'
                  : 'Camera not found or not accessible.');
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleRecipientPhotoCapture}
            disabled={loading}
            className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            Capture Photo
          </button>
          {recipientPhotoPath && <p className="text-sm text-emerald-600">✓ Photo captured</p>}
        </div>
      )}

      {/* Step 3: Recipient Ghana Card Verification - Hand device to recipient */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Hand this device to {recipientName}. They must enter their Ghana Card number and verify to complete delivery.
          </p>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-slate-700">Ghana Card Verification (Required)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipientGhanaCard}
                onChange={(e) => {
                  setRecipientGhanaCard(e.target.value);
                  setRecipientGhanaCardVerified(false);
                  setError(null);
                }}
                placeholder="GHA-000000000-0"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleVerifyRecipientGhanaCard}
                disabled={verifyingGhanaCard || !recipientGhanaCard?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                {verifyingGhanaCard ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Verify
              </button>
            </div>
            {recipientGhanaCardVerified && (
              <p className="text-sm text-emerald-600 mt-2">✓ Ghana Card verified — you can proceed to complete delivery</p>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Review and complete. Recipient must have verified their Ghana Card in the previous step.
          </p>
          <textarea
            placeholder="Driver notes (optional)"
            value={recipientComments}
            onChange={(e) => setRecipientComments(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg"
            rows={3}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !recipientGhanaCardVerified}
            className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
            Close Trip & Complete Delivery
          </button>
          {!recipientGhanaCardVerified && (
            <p className="text-xs text-amber-600">Go back to complete recipient Ghana Card verification.</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-slate-600 disabled:opacity-40"
        >
          <ArrowLeft size={18} /> Back
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 2 && !recipientGhanaCardVerified}
            className="flex items-center gap-1 text-emerald-600 font-medium disabled:opacity-50"
          >
            Next <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DeliveryVerification;
