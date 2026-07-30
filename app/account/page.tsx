'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from 'lucide-react';
import EmailBackupModal from "@/components/EmailBackupModal";
import { Mail, CheckCircle } from "lucide-react";
import CryptoJS from 'crypto-js';

export default function AccountCreatedPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<{ mnemonic: string; stxPrivateKey: string; address: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showEmailBackup, setShowEmailBackup] = useState(false);
  const [emailBackupCreated, setEmailBackupCreated] = useState(false);
  const [backupPassword, setBackupPassword] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInitialLoading(true);
      setTimeout(() => {
        const data = sessionStorage.getItem("cholo_new_wallet");
        if (data) setWallet(JSON.parse(data));
        setInitialLoading(false);
      }, 600); 
    }
  }, []);

  const handleConfirm = () => {
    if (wallet && typeof window !== "undefined") {
      setLoading(true);
      
      let sessionData;
      if (backupPassword) {
        // Create password-protected session with hash
        const passwordHash = CryptoJS.SHA256(backupPassword).toString();
        sessionData = {
          stxPrivateKey: wallet.stxPrivateKey,
          address: wallet.address,
          createdAt: Date.now(),
          passwordProtected: true,
          passwordHash: passwordHash
        };
      } else {
        // Regular session without password protection
        sessionData = {
          stxPrivateKey: wallet.stxPrivateKey,
          address: wallet.address,
          createdAt: Date.now()
        };
      }
      
      localStorage.setItem("cholo_session", JSON.stringify(sessionData));
      window.dispatchEvent(new Event("cholo-session-update"));
      router.push(`/${wallet.address}`);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="flex items-center justify-center w-full mb-4">
          <LoaderCircle className="animate-spin text-primary" size={38} strokeWidth={2.5} />
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-lg text-gray-400">No se encontró ninguna billetera. Primero crea una cuenta.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="bg-[#111] rounded-2xl p-8 max-w-lg w-full border-[1px] border-[#222] shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4 text-white">Tu cuenta ha sido creada</h2>
        <div className="mb-4 text-sm bg-white text-black text-center p-4 rounded-lg">
          <p>A continuación verás las 24 palabras que componen tu frase de recuperación.</p>
          <br/>
          <p>Anótala, guárdala en un lugar seguro y nunca la compartas. Tu frase de recuperación es la única forma de acceder a tus fondos.</p>
          <br/>
          <p>No guardamos tu frase de recuperación ni podemos restaurarla. Solo tú tienes acceso a tu cuenta.</p>
        </div>
        <div className="mb-6">
          <div className="font-semibold text-white mb-1 text-center">Frase semilla:</div>
          <div className="bg-[#181818] text-white font-mono p-6 rounded break-words text-xl leading-7">{wallet.mnemonic}</div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={() => setShowEmailBackup(true)}
            className={`w-full font-semibold rounded-xl py-4 flex items-center justify-center gap-2 ${
              emailBackupCreated 
                ? 'bg-green-800 text-green-200 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            disabled={loading || emailBackupCreated}
          >
            {emailBackupCreated ? (
              <>
                <CheckCircle size={20} />
                Correo enviado
              </>
            ) : (
              <>
                <Mail size={20} />
                Crear respaldo por correo
              </>
            )}
          </Button>
          
          <Button
            onClick={handleConfirm}
            className="w-full bg-[#2563eb] text-white font-semibold rounded-xl py-4 hover:bg-[#1d4ed8] cursor-pointer select-none flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center w-full">
                <LoaderCircle className="animate-spin text-primary" size={38} strokeWidth={2.5} />
              </span>
            ) : (
              <>He guardado mis credenciales, continuar</>
            )}
          </Button>
        </div>
      </div>
      
      {showEmailBackup && wallet && (
        <EmailBackupModal
          walletData={wallet}
          onClose={() => setShowEmailBackup(false)}
          onSuccess={(password) => {
            setShowEmailBackup(false);
            setEmailBackupCreated(true);
            setBackupPassword(password);
          }}
        />
      )}
    </div>
  );
}
