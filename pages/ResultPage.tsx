
import React, { useEffect, useState, useRef } from 'react';
import { Concept, PhotoboothSettings } from '../types';
import { generateAIImage } from '../lib/gemini';
import { uploadToDrive } from '../lib/appsScript';

interface ResultPageProps {
  capturedImage: string;
  concept: Concept;
  settings: PhotoboothSettings;
  onDone: () => void;
  onGallery: () => void;
}

const ResultPage: React.FC<ResultPageProps> = ({ capturedImage, concept, settings, onDone, onGallery }) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<{ downloadUrl: string; shareUrl: string } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [progress, setProgress] = useState("AI_CORE_PROCESSING");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPortrait = settings.orientation === 'portrait';
  const aspectRatio = isPortrait ? '9:16' : '16:9';
  
  // Resolusi tinggi untuk hasil cetak/simpan
  const targetWidth = isPortrait ? 1080 : 1920;
  const targetHeight = isPortrait ? 1920 : 1080;

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

    const processFlow = async () => {
      try {
        // 1. Generate AI Image
        setProgress("Processing...");
        const aiOutput = await generateAIImage(capturedImage, concept.prompt, aspectRatio);
        
        // 2. Tempel Overlay PNG
        setProgress("APPLYING_FRAME_OVERLAY...");
        const finalImage = await applyOverlay(aiOutput, settings.overlayImage);
        
        // 3. Update UI
        setResultImage(finalImage);
        setIsProcessing(false);
        if (timerRef.current) clearInterval(timerRef.current);
        
        // 4. Upload ke Google Drive
        setProgress("UPLOADING_TO_ARCHIVE...");
        const res = await uploadToDrive(finalImage, {
          conceptName: concept.name,
          eventName: settings.eventName,
          eventId: settings.activeEventId,
          folderId: settings.folderId
        });
        
        if (res.ok) {
          setUploadData({ downloadUrl: res.imageUrl, shareUrl: res.viewUrl });
        } else {
          console.error("Upload failed but image is shown locally.");
        }
      } catch (err: any) {
        console.error("Process Flow Error:", err);
        setError(err.message || "Transformation failed. Neural link unstable.");
        setIsProcessing(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    processFlow();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [capturedImage, concept, settings, aspectRatio]);

  const applyOverlay = (base64AI: string, overlayUrl: string | null): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context unavailable");

      // Load AI Image
      const baseImg = new Image();
      baseImg.onload = () => {
        // Gambar dasar (AI)
        ctx.drawImage(baseImg, 0, 0, targetWidth, targetHeight);
        
        // Jika tidak ada overlay, langsung selesai
        if (!overlayUrl || overlayUrl.trim() === '') {
          return resolve(canvas.toDataURL('image/jpeg', 0.92));
        }
        
        // Load Overlay PNG
        const ovrImg = new Image();
        // Force CORS anonymous dan tambahkan cache-buster untuk menghindari isu cache browser
        ovrImg.crossOrigin = "anonymous";
        
        ovrImg.onload = () => {
          // Gambar overlay di atas AI (Layer 2)
          ctx.drawImage(ovrImg, 0, 0, targetWidth, targetHeight);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        
        ovrImg.onerror = (err) => {
          console.warn("Overlay failed to load. Returning base AI image.", err);
          // Tetap lanjut meskipun frame gagal agar user tidak stuck
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };

        // Tambahkan timestamp agar browser tidak mengambil dari cache yang mungkin bermasalah CORS-nya
        const cacheBuster = overlayUrl.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
        ovrImg.src = overlayUrl + cacheBuster;
      };
      
      baseImg.onerror = () => reject("Base image failed to load");
      baseImg.src = base64AI;
    });
  };

  if (isProcessing) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center relative p-6 text-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0 flex items-center justify-center p-4">
          <img src={capturedImage} className="max-w-full max-h-full object-contain opacity-50 blur-lg" alt="Preview" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-56 h-56 md:w-80 md:h-80 mb-12 shrink-0">
            <div className="absolute inset-0 border-[6px] border-white/5 rounded-full" />
            <div className="absolute inset-0 border-[6px] border-t-purple-500 rounded-full animate-spin shadow-[0_0_30px_rgba(188,19,254,0.4)]" />
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-[10px] tracking-[0.5em] text-purple-400 font-bold mb-2 uppercase italic">Processing</span>
              <span className="text-5xl md:text-7xl font-heading text-white italic">{timer}S</span>
            </div>
          </div>
          <div className="max-w-md bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-2xl md:text-4xl font-heading mb-4 neon-text italic uppercase tracking-tighter">{progress}</h2>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-4">
              <div className="bg-purple-500 h-full animate-[progress_10s_ease-in-out_infinite]" style={{width: '60%'}} />
            </div>
            <p className="text-gray-400 font-mono text-[10px] tracking-[0.2em] uppercase leading-relaxed">
              Coroai.app is synthesizing your digital persona. <br/>Please remain within the transmission area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#050505]">
        <div className="w-20 h-20 border-2 border-red-500/50 rounded-full flex items-center justify-center mb-8">
          <span className="text-red-500 text-4xl font-bold">!</span>
        </div>
        <h2 className="text-red-500 text-2xl font-heading mb-4 uppercase italic">Neural_Link_Severed</h2>
        <p className="text-gray-500 mb-10 max-w-xs font-mono text-xs uppercase tracking-widest">{error}</p>
        <button onClick={onDone} className="px-16 py-6 bg-white text-black font-heading font-bold uppercase italic tracking-[0.3em] hover:bg-purple-500 hover:text-white transition-all">REBOOT_SESSION</button>
      </div>
    );
  }

  const resultContainerClass = isPortrait ? "w-full max-w-[340px] md:max-w-[480px] aspect-[9/16]" : "w-full max-w-3xl aspect-[16/9]";

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 bg-[#050505] overflow-y-auto relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{animationDelay: '1s'}} />
      </div>

      <div className="relative flex flex-col items-center w-full max-w-5xl">
        <div className={`relative ${resultContainerClass} border-4 border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] bg-gray-900 rounded-2xl overflow-hidden group`}>
          <img src={resultImage!} alt="Final Composition" className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {!showQR && (
            <div className="absolute bottom-10 left-0 right-0 flex justify-center z-30">
              <button 
                onClick={() => setShowQR(true)} 
                className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-4 rounded-full font-heading text-xs tracking-[0.4em] uppercase italic transition-all shadow-[0_10px_30px_rgba(188,19,254,0.4)] animate-bounce active:scale-95"
              >
                DOWNLOAD
              </button>
            </div>
          )}

          {showQR && (
            <div className="absolute inset-x-0 bottom-0 bg-black/95 backdrop-blur-2xl p-10 flex flex-col items-center border-t border-white/10 animate-in slide-in-from-bottom duration-500 z-40">
              <button onClick={() => setShowQR(false)} className="absolute top-6 right-8 text-white/30 text-3xl font-mono hover:text-white transition-colors">×</button>
              
              <div className="bg-white p-5 rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] mb-6 border-8 border-purple-500/20">
                {uploadData ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uploadData.shareUrl)}`} 
                    alt="Download QR" 
                    className="w-48 h-48 md:w-64 md:h-64" 
                  />
                ) : (
                  <div className="w-48 h-48 md:w-64 md:h-64 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <span className="text-black/40 font-mono text-[8px] uppercase tracking-widest">Generating Link...</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-white font-heading text-sm tracking-[0.2em] mb-2 uppercase italic">SCAN_TO_DOWNLOAD</p>
                <p className="text-white/40 text-[9px] font-mono tracking-widest uppercase italic">Your digital masterpiece is ready for transmission</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg mt-12 z-20">
          <button onClick={onDone} className="flex-1 py-6 bg-white/5 border-2 border-white/10 text-white font-heading tracking-[0.4em] hover:bg-white hover:text-black transition-all text-sm uppercase italic rounded-xl">FINISH</button>
          <button onClick={onGallery} className="flex-1 py-6 bg-purple-600/10 border-2 border-purple-500/30 text-purple-400 font-heading tracking-[0.4em] hover:bg-purple-600/30 hover:text-purple-200 transition-all text-sm uppercase italic rounded-xl">GALLERY</button>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ResultPage;
