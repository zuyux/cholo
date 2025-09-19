import { ModeToggle } from './modeToggle';

export default function Footer() {
  return (
    <footer className="bg-surface-primary/50 text-foreground py-12 select-none border-t border-border">
      <div className="container mx-auto px-4">
        
          <div className="absolute bottom-0 right-0 items-center">
            <ModeToggle />
          </div>
      </div>
    </footer>
  )
}
