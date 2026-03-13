/**
 * ScanQR — In-app QR code scanner using device camera.
 * Scans QR codes manually via a "Take Picture" button to avoid mobile crashes.
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { FiCamera, FiRefreshCcw } from 'react-icons/fi';

export default function ScanQR() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    const webcamRef = useRef(null);
    const [facingMode, setFacingMode] = useState("environment");

    /**
     * Extract the egg UUID from a scanned QR code value.
     */
    const extractEggCode = useCallback((text) => {
        const urlMatch = text.match(/\/redeem\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (urlMatch) return urlMatch[1];

        const uuidMatch = text.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        if (uuidMatch) return uuidMatch[0];

        return null;
    }, []);

    const toggleCamera = () => {
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
    };

    const handleUserMedia = () => {
        setCameraReady(true);
        setError('');
        setPermissionDenied(false);
    };

    const handleUserMediaError = (err) => {
        console.error("Webcam Error:", err);
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
            setPermissionDenied(true);
            setError('Camera permission was denied. Please allow camera access.');
        } else if (err?.name === 'NotFoundError') {
            setError('No camera detected on this device.');
        } else {
            setError(`Could not start camera: ${err?.message || 'Unknown error'}`);
        }
    };

    const captureAndScan = useCallback(() => {
        if (!webcamRef.current) return;
        
        setProcessing(true);
        setError('');

        // 1. Capture base64 image from webcam
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setError('Failed to capture picture. Please try again.');
            setProcessing(false);
            return;
        }

        // 2. Load into an Image object to get natural dimensions
        const img = new Image();
        img.onload = () => {
            // 3. Draw to off-screen canvas to extract pixel data
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 4. Pass pixel data to jsQR
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert", // Faster processing
            });

            if (code && code.data) {
                const eggCode = extractEggCode(code.data);
                if (eggCode) {
                    // Success! Navigate to redeem page.
                    navigate(`/redeem/${eggCode}`);
                } else {
                    setError('QR code found, but it is not a valid Egg Hunt code.');
                    setProcessing(false);
                }
            } else {
                setError('No QR code detected in the picture. Try moving closer or adjusting lighting.');
                setProcessing(false);
            }
        };
        img.onerror = () => {
            setError('Error processing image. Please try again.');
            setProcessing(false);
        };
        img.src = imageSrc;
    }, [webcamRef, extractEggCode, navigate]);

    return (
        <div className="page" style={{ paddingBottom: '100px' }}>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiCamera /> Scan QR Code
                </h1>
                <p className="subtitle" style={{ fontSize: '0.9rem' }}>
                    Take a picture of an Egg QR Code to redeem it
                </p>
            </div>

            <div className="scanner-container" style={{ margin: '0 auto', maxWidth: '500px' }}>
                
                {/* Error Banner */}
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '1rem' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{error}</p>
                        {permissionDenied && (
                            <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', textAlign: 'left' }}>
                                <strong>How to fix:</strong>
                                <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                                    <li><strong>iOS/Safari:</strong> Tap AA in address bar → Website Settings → Camera → Allow, then reload.</li>
                                    <li><strong>Android/Chrome:</strong> Tap lock in address bar → Permissions → Camera, then reload.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Webcam Preview Area */}
                <div 
                    className="webcam-wrapper" 
                    style={{ 
                        position: 'relative', 
                        width: '100%', 
                        aspectRatio: '1 / 1', 
                        backgroundColor: '#000',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        marginBottom: '1.5rem'
                    }}
                >
                    {!cameraReady && !error && (
                        <div style={{ 
                            position: 'absolute', inset: 0, 
                            display: 'flex', flexDirection: 'column', 
                            alignItems: 'center', justifyContent: 'center', color: '#fff' 
                        }}>
                            <div className="spinner large" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff', marginBottom: '1rem' }} />
                            <p>Starting camera...</p>
                        </div>
                    )}
                    
                    {!permissionDenied && (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={1}
                            videoConstraints={{ facingMode, aspectRatio: 1 }}
                            onUserMedia={handleUserMedia}
                            onUserMediaError={handleUserMediaError}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: cameraReady ? 1 : 0,
                                transition: 'opacity 0.3s ease'
                            }}
                        />
                    )}
                    
                    {/* Targeting Frame Overlay */}
                    {cameraReady && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '70%',
                            height: '70%',
                            border: '3px solid rgba(255, 255, 255, 0.5)',
                            borderRadius: '16px',
                            boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.3)', // Dim surroundings
                            pointerEvents: 'none',
                        }}>
                            {/* Corner frames */}
                            <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '30px', height: '30px', borderTop: '4px solid #fff', borderLeft: '4px solid #fff', borderTopLeftRadius: '16px' }} />
                            <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '30px', height: '30px', borderTop: '4px solid #fff', borderRight: '4px solid #fff', borderTopRightRadius: '16px' }} />
                            <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '30px', height: '30px', borderBottom: '4px solid #fff', borderLeft: '4px solid #fff', borderBottomLeftRadius: '16px' }} />
                            <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '30px', height: '30px', borderBottom: '4px solid #fff', borderRight: '4px solid #fff', borderBottomRightRadius: '16px' }} />
                        </div>
                    )}
                </div>

                {/* Controls Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <button 
                        onClick={captureAndScan} 
                        disabled={!cameraReady || processing}
                        className="btn btn-primary"
                        style={{ 
                            width: '100%', 
                            padding: '1.25rem', 
                            fontSize: '1.2rem', 
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: (!cameraReady || processing) ? 0.7 : 1
                        }}
                    >
                        {processing ? (
                            <><div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: '#fff' }} /> Processing...</>
                        ) : (
                            <><FiCamera size={24} /> Take Picture</>
                        )}
                    </button>

                    <button 
                        onClick={toggleCamera}
                        disabled={!cameraReady || processing}
                        className="btn btn-outline"
                        style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FiRefreshCcw /> Flip Camera
                    </button>
                </div>

            </div>
        </div>
    );
}
