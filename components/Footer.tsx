import { ModeToggle } from './modeToggle';
import { NetworkSelector } from './NetworkSelector';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-sm text-white h-8 text-xs z-50">
      <div className="container mx-auto h-full px-4">
        <div className="flex justify-between items-center h-full">
          <p className="text-center flex-1 truncate">
$CHOLO is a meme token created for cultural and educational purposes. It does not represent an investment and carries no promise of financial return.
          </p>
          <div className="ml-4 flex items-center gap-2 h-full">
            <NetworkSelector />
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
