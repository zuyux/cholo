'use client';


import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react';
export const Navbar = () => {

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full h-full supports-[backdrop-filter]:bg-background/10 z-100 select-none">
        <div className="mx-auto">
          <div className="flex justify-between h-36 items-center">
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="no-underline">
                <Button className="text-7xl text-foreground bg-transparent cursor-pointer hover:bg-background">
                  $CHOLO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
