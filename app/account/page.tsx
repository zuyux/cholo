'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import EmailBackupModal from "@/components/EmailBackupModal";
import { Mail } from "lucide-react";

export default function AccountCreatedPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<{ mnemonic: string; stxPrivateKey: string; address: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showEmailBackup, setShowEmailBackup] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInitialLoading(true);
      setTimeout(() => {
        const data = sessionStorage.getItem("kapu_new_wallet");
        if (data) setWallet(JSON.parse(data));
        setInitialLoading(false);
      }, 600); 
    }
  }, []);

  const handleConfirm = () => {
    if (wallet && typeof window !== "undefined") {
      setLoading(true);
      localStorage.setItem(
        "kapu_session",
        JSON.stringify({
          stxPrivateKey: wallet.stxPrivateKey,
          address: wallet.address,
          createdAt: Date.now(),
        })
      );
      window.dispatchEvent(new Event("kapu-session-update"));
      router.push(`/${wallet.address}`);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="flex items-center justify-center w-full mb-4">
          <Image
            src="/loader.gif"
            alt="Loading..."
            width={75}
            height={37.7}
            style={{ minWidth: 75, minHeight: 37.5, width: 75, height: 37.5 }}
          />
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-lg text-gray-400">No wallet found. Please create an account first.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="bg-[#111] rounded-2xl p-8 max-w-lg w-full border-[1px] border-[#222] shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4 text-white">Your Account Has Been Created</h2>
        <div className="mb-4 text-sm bg-white text-black text-center p-4 rounded-lg">
          <p>Below, you will see 24 words that make up your recovery phrase.</p>
          <br/>
          <p>Please write it down. Keep it safe and never share it with anyone. Your recovery phrase is the only way you can access your funds.</p>
          <br/>
          <p>We do not keep nor be able to restore your recovery phrase. Only you have access to your account.</p>
        </div>
        <div className="mb-6">
          <div className="font-semibold text-white mb-1 text-center">Seed Phrase:</div>
          <div className="bg-[#181818] text-white font-mono p-6 rounded break-words text-xl leading-7">{wallet.mnemonic}</div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={() => setShowEmailBackup(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-4 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Mail size={20} />
            Create Email Backup (Recommended)
          </Button>
          
          <Button
            onClick={handleConfirm}
            className="w-full bg-[#2563eb] text-white font-semibold rounded-xl py-4 hover:bg-[#1d4ed8] cursor-pointer select-none flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center w-full">
                <Image
                  src="/loader.gif"
                  alt="Loading..."
                  width={75}
                  height={38}
                  style={{ minWidth: 75, minHeight: 38, width: 75, height: 38 }}
                />
              </span>
            ) : (
              <>I&apos;ve saved my credentials, continue</>
            )}
          </Button>
        </div>
      </div>
      
      {showEmailBackup && wallet && (
        <EmailBackupModal
          walletData={wallet}
          onClose={() => setShowEmailBackup(false)}
          onSuccess={() => {
            setShowEmailBackup(false);
            // Optionally auto-continue after successful backup
          }}
        />
      )}
    </div>
  );
}
